const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const auth = require('../middleware/authMiddleware');

// All AI routes require JWT authentication
router.use(auth);

// POST /api/ai/command - Generates a previewable validated action plan (No DB mutations)
router.post('/command', aiController.interpretCommand);

// POST /api/ai/execute-plan - Atomically executes an approved action plan within a transaction
router.post('/execute-plan', aiController.executePlan);

module.exports = router;
