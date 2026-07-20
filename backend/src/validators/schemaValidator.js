const { body } = require('express-validator');

exports.createTable = [
  body('projectId').isInt().withMessage('Valid projectId is required'),
  body('name').trim().notEmpty().withMessage('Table name is required'),
  body('x').optional().isFloat().withMessage('Position x must be a number'),
  body('y').optional().isFloat().withMessage('Position y must be a number'),
  body('width').optional().isFloat().withMessage('Width must be a number'),
  body('height').optional().isFloat().withMessage('Height must be a number'),
  body('color').optional().isString().withMessage('Color must be a string')
];

exports.updateTable = [
  body('name').optional().trim().notEmpty().withMessage('Table name cannot be empty'),
  body('x').optional().isFloat().withMessage('Position x must be a number'),
  body('y').optional().isFloat().withMessage('Position y must be a number'),
  body('width').optional().isFloat().withMessage('Width must be a number'),
  body('height').optional().isFloat().withMessage('Height must be a number'),
  body('color').optional().isString().withMessage('Color must be a string')
];

exports.createColumn = [
  body('tableId').isInt().withMessage('Valid tableId is required'),
  body('name').trim().notEmpty().withMessage('Column name is required'),
  body('datatype').trim().notEmpty().withMessage('Datatype is required')
    .isIn([
      'INT', 'BIGINT', 'VARCHAR', 'TEXT', 'BOOLEAN', 'DATE', 
      'DATETIME', 'TIMESTAMP', 'FLOAT', 'DOUBLE', 'DECIMAL', 
      'JSON', 'UUID', 'ENUM'
    ]).withMessage('Unsupported datatype'),
  body('length').optional({ nullable: true }).isString().withMessage('Length must be a string'),
  body('nullable').optional().isBoolean().withMessage('Nullable must be a boolean'),
  body('primaryKey').optional().isBoolean().withMessage('PrimaryKey must be a boolean'),
  body('foreignKey').optional().isBoolean().withMessage('ForeignKey must be a boolean'),
  body('uniqueKey').optional().isBoolean().withMessage('UniqueKey must be a boolean'),
  body('autoIncrement').optional().isBoolean().withMessage('AutoIncrement must be a boolean'),
  body('defaultValue').optional({ nullable: true }).isString().withMessage('Default value must be a string'),
  body('comment').optional({ nullable: true }).isString().withMessage('Comment must be a string')
];

exports.updateColumn = [
  body('name').optional().trim().notEmpty().withMessage('Column name cannot be empty'),
  body('datatype').optional().trim().notEmpty().withMessage('Datatype is required')
    .isIn([
      'INT', 'BIGINT', 'VARCHAR', 'TEXT', 'BOOLEAN', 'DATE', 
      'DATETIME', 'TIMESTAMP', 'FLOAT', 'DOUBLE', 'DECIMAL', 
      'JSON', 'UUID', 'ENUM'
    ]).withMessage('Unsupported datatype'),
  body('length').optional({ nullable: true }).isString().withMessage('Length must be a string'),
  body('nullable').optional().isBoolean().withMessage('Nullable must be a boolean'),
  body('primaryKey').optional().isBoolean().withMessage('PrimaryKey must be a boolean'),
  body('foreignKey').optional().isBoolean().withMessage('ForeignKey must be a boolean'),
  body('uniqueKey').optional().isBoolean().withMessage('UniqueKey must be a boolean'),
  body('autoIncrement').optional().isBoolean().withMessage('AutoIncrement must be a boolean'),
  body('defaultValue').optional({ nullable: true }).isString().withMessage('Default value must be a string'),
  body('comment').optional({ nullable: true }).isString().withMessage('Comment must be a string')
];

exports.createRelationship = [
  body('projectId').isInt().withMessage('Valid projectId is required'),
  body('fromTableId').isInt().withMessage('Valid fromTableId is required'),
  body('fromColumnId').isInt().withMessage('Valid fromColumnId is required'),
  body('toTableId').isInt().withMessage('Valid toTableId is required'),
  body('toColumnId').isInt().withMessage('Valid toColumnId is required'),
  body('relationType').trim().isIn(['OneToOne', 'OneToMany', 'ManyToOne', 'ManyToMany']).withMessage('Invalid relationType'),
  body('onDelete').optional().trim().isIn(['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION']).withMessage('Invalid onDelete rule'),
  body('onUpdate').optional().trim().isIn(['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION']).withMessage('Invalid onUpdate rule')
];

exports.updateRelationship = [
  body('relationType').optional().trim().isIn(['OneToOne', 'OneToMany', 'ManyToOne', 'ManyToMany']).withMessage('Invalid relationType'),
  body('onDelete').optional().trim().isIn(['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION']).withMessage('Invalid onDelete rule'),
  body('onUpdate').optional().trim().isIn(['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION']).withMessage('Invalid onUpdate rule')
];
