const express = require('express');
const router = express.Router();
const schemaController = require('../controllers/schemaController');
const schemaValidator = require('../validators/schemaValidator');
const validate = require('../middleware/validatorMiddleware');
const auth = require('../middleware/authMiddleware');

router.use(auth); // protect all schema routes

// Schema fetch (returns tables, columns, relationships grouped together)
router.get('/schema/:projectId', schemaController.getSchema);

// Tables
router.post('/tables', schemaValidator.createTable, validate, schemaController.createTable);
router.put('/tables/:id', schemaValidator.updateTable, validate, schemaController.updateTable);
router.delete('/tables/:id', schemaController.deleteTable, schemaController.deleteTable);

// Columns
router.post('/columns', schemaValidator.createColumn, validate, schemaController.createColumn);
router.put('/columns/:id', schemaValidator.updateColumn, validate, schemaController.updateColumn);
router.delete('/columns/:id', schemaController.deleteColumn);

// Relationships
router.post('/relationships', schemaValidator.createRelationship, validate, schemaController.createRelationship);
router.put('/relationships/:id', schemaValidator.updateRelationship, validate, schemaController.updateRelationship);
router.delete('/relationships/:id', schemaController.deleteRelationship);

module.exports = router;
