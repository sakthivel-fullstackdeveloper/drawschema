const { validationResult } = require('express-validator');

module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMsg = errors.array().map(e => e.msg).join(', ');
    return res.status(400).json({
      success: false,
      message: errorMsg,
      data: { errors: errors.array() }
    });
  }
  next();
};
