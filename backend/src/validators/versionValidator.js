const { body } = require('express-validator');

exports.createVersion = [
  body('name').optional().trim().isString().withMessage('Version name must be a string'),
  body('description').optional().trim().isString().withMessage('Description must be a string'),
  body('isAutoSave').optional().isBoolean().withMessage('isAutoSave must be a boolean')
];

exports.updateVersion = [
  body('name').optional().trim().notEmpty().withMessage('Version name cannot be empty'),
  body('description').optional().trim().isString().withMessage('Description must be a string'),
  body('isPinned').optional().isBoolean().withMessage('isPinned must be a boolean')
];
