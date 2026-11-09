const jwt = require('jsonwebtoken');
const { userService } = require('../services/dataService');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'sprintsync_super_secret_jwt_key_2026_production_ready'
      );

      // Resolve user via data service (handles both active MongoDB and in-memory store)
      const user = await userService.findById(decoded.id);
      if (user) {
        req.user = user;
      } else {
        req.user = {
          id: decoded.id,
          _id: decoded.id,
          email: decoded.email,
          role: decoded.role || 'admin',
          name: decoded.name || 'User',
        };
      }
      return next();
    } catch (error) {
      console.error('[AuthMiddleware] Token verification failed:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied: Admin permissions required' });
  }
};

module.exports = { protect, adminOnly };
