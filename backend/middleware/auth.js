const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
    const cookieToken = req.cookies && (req.cookies.auth_token || req.cookies.token);
  const token = (authHeader && authHeader.split(' ')[1]) || cookieToken; // Bearer TOKEN or HttpOnly cookie

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken }; 