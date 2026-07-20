const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const projectValidator = require('../validators/projectValidator');
const validate = require('../middleware/validatorMiddleware');
const auth = require('../middleware/authMiddleware');

router.use(auth); // protect all project routes

router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProject);
router.post('/', projectValidator.create, validate, projectController.createProject);
router.put('/:id', projectValidator.rename, validate, projectController.renameProject);
router.delete('/:id', projectController.deleteProject);
router.post('/:id/duplicate', projectController.duplicateProject);

module.exports = router;
