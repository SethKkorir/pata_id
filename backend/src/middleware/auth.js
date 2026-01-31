const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
  console.log('[AUTH] Protect Middleware:', req.method, req.originalUrl);
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
    console.log('[AUTH] Token found in Authorization Header');
  } else if (req.cookies && req.cookies.token) {
    // Set token from cookie
    token = req.cookies.token;
    console.log('[AUTH] Token found in Cookie');
  }

  // Make sure token exists
  if (!token) {
    console.warn('[AUTH] No token found in request headers or cookies');
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route',
    });
  }

  try {
    // Verify token
    const secret = process.env.JWT_SECRET || 'pataid_internal_fallback_secret_dont_use_in_prod';
    const decoded = jwt.verify(token, secret);
    console.log('[AUTH] Token verified successfully for user ID:', decoded.id);

    req.user = await User.findById(decoded.id);

    if (!req.user) {
      console.warn('[AUTH] User in token not found in database');
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route',
      });
    }

    next();
  } catch (err) {
    console.error('[AUTH] JWT Verification failed:', err.message);
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route',
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Insufficient permissions',
      });
    }
    next();
  };
};

// Set user if token exists (doesn't block if not)
exports.setUser = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch (err) {
    next();
  }
};
