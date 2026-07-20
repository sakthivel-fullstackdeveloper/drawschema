const authService = require('../services/authService');

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        data: {}
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = authService.verifyToken(token);
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    res.status(error.statusCode || 401).json({
      success: false,
      message: error.message || 'Invalid token',
      data: {}
    });
  }
};
