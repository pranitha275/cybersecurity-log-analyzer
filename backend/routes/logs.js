const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');
const LogParser = require('../utils/logParser');
const AIAnalyzer = require('../utils/aiAnalyzer');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.log'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt and .log files are allowed'));
    }
  }
});

// Upload log file
router.post('/upload', authenticateToken, upload.single('logFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId } = req.user;
    const { filename, originalname, size, path: filePath } = req.file;

    // Parse the uploaded log file
    const logParser = new LogParser();
    const parseResult = await logParser.parseLogFile(filePath);

    // Save file info to database
    const logFile = await pool.query(
      'INSERT INTO log_files (user_id, filename, original_filename, file_size, file_path, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, filename, originalname, size, filePath, 'parsed']
    );

    // Save parsed log entries to database
    const fileId = logFile.rows[0].id;
    const aiAnalyzer = new AIAnalyzer();
    
    // Analyze entries with AI
    const analyzedEntries = await aiAnalyzer.analyzeBatch(parseResult.parsedEntries);
    
    for (const entry of analyzedEntries) {
      await pool.query(
        `INSERT INTO log_entries (
          log_file_id, timestamp, ip_address, event_description, 
          status, confidence_score, explanation, threat_level, recommended_action, raw_log_line, log_type, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          fileId,
          entry.timestamp,
          entry.ip_address,
          entry.event_description,
          entry.status,
          entry.confidence_score,
          entry.explanation,
          entry.threat_level,
          entry.recommended_action,
          entry.raw_log_line,
          entry.log_type || 'generic'
        ]
      );
    }

    res.status(201).json({
      message: 'File uploaded and parsed successfully',
      file: {
        id: logFile.rows[0].id,
        filename: originalname,
        size: size,
        uploadDate: logFile.rows[0].upload_date
      },
      parseResult: {
        format: parseResult.format,
        totalLines: parseResult.totalLines,
        parsedEntries: parseResult.parsedEntries.length,
        summary: parseResult.summary
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's log files
router.get('/files', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    
    const files = await pool.query(
      'SELECT id, original_filename, file_size, upload_date, status FROM log_files WHERE user_id = $1 ORDER BY upload_date DESC',
      [userId]
    );

    res.json({ files: files.rows });

  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get log analysis results
router.get('/analysis/:fileId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { fileId } = req.params;

    // Verify file belongs to user
    const file = await pool.query(
      'SELECT id, original_filename, upload_date FROM log_files WHERE id = $1 AND user_id = $2',
      [fileId, userId]
    );

    if (file.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get log entries for this file
    const entries = await pool.query(
      `SELECT 
        id,
        log_file_id,
        timestamp, 
        ip_address, 
        event_description, 
        status, 
        confidence_score, 
        explanation,
        threat_level,
        recommended_action,
        raw_log_line,
        log_type,
        created_at
      FROM log_entries 
      WHERE log_file_id = $1 
      ORDER BY timestamp DESC`,
      [fileId]
    );

    // Get summary statistics
    const summary = await pool.query(
      `SELECT 
        COUNT(*) as total_entries,
        COUNT(DISTINCT ip_address) as unique_ips,
        MIN(timestamp) as earliest_entry,
        MAX(timestamp) as latest_entry
      FROM log_entries 
      WHERE log_file_id = $1`,
      [fileId]
    );

    res.json({ 
      file: file.rows[0],
      entries: entries.rows,
      summary: summary.rows[0]
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Re-analyze existing log entries with AI
router.post('/reanalyze/:fileId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { fileId } = req.params;

    // Verify file belongs to user
    const file = await pool.query(
      'SELECT id FROM log_files WHERE id = $1 AND user_id = $2',
      [fileId, userId]
    );

    if (file.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get existing log entries
    const entries = await pool.query(
      'SELECT * FROM log_entries WHERE log_file_id = $1 ORDER BY timestamp',
      [fileId]
    );

    if (entries.rows.length === 0) {
      return res.status(404).json({ error: 'No log entries found' });
    }

    // Re-analyze with AI
    const aiAnalyzer = new AIAnalyzer();
    const analyzedEntries = await aiAnalyzer.analyzeBatch(entries.rows);

    // Update database with new analysis
    for (const entry of analyzedEntries) {
      await pool.query(
        `UPDATE log_entries 
         SET status = $1, confidence_score = $2, explanation = $3, threat_level = $4, recommended_action = $5 
         WHERE id = $6`,
        [entry.status, entry.confidence_score, entry.explanation, entry.threat_level, entry.recommended_action, entry.id]
      );
    }

    res.json({
      message: 'Re-analysis completed',
      analyzedEntries: analyzedEntries.length,
      anomaliesFound: analyzedEntries.filter(e => e.status === 'anomaly').length
    });

  } catch (error) {
    console.error('Re-analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete log file and all associated entries
router.delete('/files/:fileId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { fileId } = req.params;

    // Verify file belongs to user
    const file = await pool.query(
      'SELECT id, file_path FROM log_files WHERE id = $1 AND user_id = $2',
      [fileId, userId]
    );

    if (file.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = file.rows[0].file_path;

    // Start a transaction to ensure data consistency
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Delete all log entries for this file (this will happen automatically due to CASCADE)
      // But we can also do it explicitly for clarity
      await client.query('DELETE FROM log_entries WHERE log_file_id = $1', [fileId]);

      // Delete the log file record
      await client.query('DELETE FROM log_files WHERE id = $1', [fileId]);

      // Delete the physical file from uploads directory
      const fs = require('fs');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await client.query('COMMIT');

      res.json({ 
        message: 'File and all associated analysis data deleted successfully',
        deletedFileId: fileId
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 