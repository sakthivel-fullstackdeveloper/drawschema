const express = require('express');
const router = express.Router();
const versionController = require('../controllers/versionController');
const versionValidator = require('../validators/versionValidator');
const validate = require('../middleware/validatorMiddleware');
const auth = require('../middleware/authMiddleware');

router.use(auth); // protect all version history routes

// Version CRUD and Restores
router.post('/projects/:id/versions', versionValidator.createVersion, validate, versionController.createVersion);
router.get('/projects/:id/versions', versionController.getVersions);
router.get('/projects/:id/versions/:versionId', versionController.getVersion);
router.put('/projects/:id/versions/:versionId', versionValidator.updateVersion, validate, versionController.updateVersion);
router.delete('/projects/:id/versions/:versionId', versionController.deleteVersion);
router.post('/projects/:id/versions/:versionId/restore', versionController.restoreVersion);

module.exports = router;
