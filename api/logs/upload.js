import multer from 'multer';
import { pool } from '../db.js';
import { parseLogFile } from '../utils/logParser.js';
import { analyzeLogs } from '../utils/aiAnalyzer.js';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
});

// Helper function to run multer
const runMiddleware = (req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get token from cookie or header
    const token = req.cookies?.auth_token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.userId;

    // Run multer middleware
    await runMiddleware(req, res, upload.single('logFile'));

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, buffer, mimetype } = req.file;

    // Validate file type
    const allowedTypes = ['text/plain', 'text/csv', 'application/octet-stream'];
    if (!allowedTypes.includes(mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only .txt and .csv files are allowed.' });
    }

    // Parse the log file
    const logContent = buffer.toString('utf-8');
    const parsedLogs = parseLogFile(logContent, originalname);

    if (!parsedLogs || parsedLogs.length === 0) {
      return res.status(400).json({ error: 'Could not parse log file. Please check the file format.' });
    }

    // Save file info to database
    const fileResult = await pool.query(
      'INSERT INTO log_files (user_id, original_filename, file_size, upload_date, status) VALUES ($1, $2, $3, NOW(), $4) RETURNING id',
      [userId, originalname, buffer.length, 'uploaded']
    );

    const fileId = fileResult.rows[0].id;

    // Analyze logs and save to database
    const analysisPromises = parsedLogs.map(async (entry) => {
      const analysis = await analyzeLogs(entry);
      
      return pool.query(
        `INSERT INTO log_entries (
          log_file_id, timestamp, ip_address, event_description,
          status, confidence_score, explanation, threat_level, recommended_action, raw_log_line, log_type, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          fileId,
          entry.timestamp,
          entry.ip_address,
          entry.event_description,
          analysis.status,
          analysis.confidence_score,
          analysis.explanation,
          analysis.threat_level,
          analysis.recommended_action,
          entry.raw_log_line,
          entry.log_type || 'generic'
        ]
      );
    });

    await Promise.all(analysisPromises);

    // Update file status
    await pool.query(
      'UPDATE log_files SET status = $1 WHERE id = $2',
      ['analyzed', fileId]
    );

    res.status(201).json({
      message: 'File uploaded and analyzed successfully',
      fileId,
      filename: originalname,
      logCount: parsedLogs.length
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Configure API route to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}; 