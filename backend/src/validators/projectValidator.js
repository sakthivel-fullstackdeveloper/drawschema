const { body } = require('express-validator');

exports.create = [
  body('name').trim().notEmpty().withMessage('Project name is required')
];

exports.rename = [
  body('name').trim().notEmpty().withMessage('Project name is required')
];
