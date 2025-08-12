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

    // Get all log entries for user's files
    const entries = await pool.query(
      `SELECT 
        le.id,
        le.log_file_id,
        le.timestamp,
        le.ip_address,
        le.event_description,
        le.status,
        le.confidence_score,
        le.explanation,
        le.threat_level,
        le.recommended_action,
        le.raw_log_line,
        le.log_type,
        le.created_at
      FROM log_entries le
      JOIN log_files lf ON le.log_file_id = lf.id
      WHERE lf.user_id = $1
      ORDER BY le.timestamp DESC`,
      [userId]
    );

    res.json({
      entries: entries.rows
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Get entries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 