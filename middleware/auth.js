const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
// A login token issued before the last password change is no longer valid.
const loadUser = async (decoded) => {
  const user = await User.findById(decoded.id).select('+passwordChangedAt');
  if (user && user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt.getTime()) return null;
  return user;
};

const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header or cookie
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Vui lòng đăng nhập để truy cập'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await loadUser(decoded);
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại'
      });
    }
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ'
    });
  }
};

// Optional auth - doesn't block if no token
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await loadUser(decoded);
    } catch (error) {
      req.user = null;
    }
  }

  next();
};

module.exports = { protect, optionalAuth };
