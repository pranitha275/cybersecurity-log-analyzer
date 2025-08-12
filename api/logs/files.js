import { pool } from '../db.js';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

    // Get user's files
    const files = await pool.query(
      'SELECT id, original_filename, file_size, upload_date, status FROM log_files WHERE user_id = $1 ORDER BY upload_date DESC',
      [userId]
    );

    res.json({
      files: files.rows
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 