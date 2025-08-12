import { pool } from '../db.js';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
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

    const { fileId } = req.query;

    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    // Verify file belongs to user
    const file = await pool.query(
      'SELECT id FROM log_files WHERE id = $1 AND user_id = $2',
      [fileId, userId]
    );

    if (file.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete in transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete log entries first (due to foreign key constraint)
      await client.query('DELETE FROM log_entries WHERE log_file_id = $1', [fileId]);
      
      // Delete file record
      await client.query('DELETE FROM log_files WHERE id = $1', [fileId]);
      
      await client.query('COMMIT');
      
      res.json({
        message: 'File and all associated analysis data deleted successfully',
        deletedFileId: parseInt(fileId)
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 