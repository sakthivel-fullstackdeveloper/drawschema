const aiService = require('../services/aiService');
const aiExecutionService = require('../services/aiExecutionService');
const schemaService = require('../services/schemaService');
const { validateActionPlanSemantics } = require('../validators/aiValidator');

class AIController {
  /**
   * Generates a previewable, validated AI action plan for a given prompt and project.
   * Does NOT mutate the database.
   * 
   * Route: POST /api/ai/command
   */
  async interpretCommand(req, res, next) {
    try {
      const { projectId, prompt, history } = req.body || {};
      const userId = req.user?.id;

      if (!projectId || isNaN(parseInt(projectId, 10))) {
        return res.status(400).json({
          success: false,
          message: 'Valid projectId is required',
          data: {}
        });
      }

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Prompt string is required',
          data: {}
        });
      }

      const pId = parseInt(projectId, 10);

      // 1. Authoritative ownership & schema verification
      await schemaService.verifyProjectOwnership(pId, userId);

      // 2. Load authoritative current schema from database
      const currentSchema = await schemaService.getSchema(pId, userId);

      // 3. Generate action plan via Groq Service (runs structural validation inside, includes history)
      const actionPlan = await aiService.generateActionPlan(prompt, currentSchema, Array.isArray(history) ? history : []);

      // 4. Run Semantic Validation against authoritative schema
      const semanticResult = validateActionPlanSemantics(actionPlan.actions, currentSchema);
      if (!semanticResult.isValid) {
        return res.status(422).json({
          success: false,
          message: `Semantic validation failed: ${semanticResult.errors.join('; ')}`,
          data: {
            errors: semanticResult.errors,
            actionPlan
          }
        });
      }

      // 5. Return plan for preview (Zero database mutation)
      res.status(200).json({
        success: true,
        message: 'Action plan generated successfully',
        data: {
          explanation: actionPlan.explanation || 'Action plan ready for review',
          actions: actionPlan.actions
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Executes an approved AI action plan atomically inside a Sequelize transaction.
   * Re-validates structure & semantics against authoritative DB state before mutating.
   * 
   * Route: POST /api/ai/execute-plan
   */
  async executePlan(req, res, next) {
    try {
      const { projectId, actionPlan } = req.body || {};
      const userId = req.user?.id;

      if (!projectId || isNaN(parseInt(projectId, 10))) {
        return res.status(400).json({
          success: false,
          message: 'Valid projectId is required',
          data: {}
        });
      }

      if (!actionPlan || typeof actionPlan !== 'object' || !Array.isArray(actionPlan.actions)) {
        return res.status(400).json({
          success: false,
          message: 'Valid actionPlan with actions array is required',
          data: {}
        });
      }

      const pId = parseInt(projectId, 10);

      // Execute transactionally via aiExecutionService
      const executionResult = await aiExecutionService.executePlan(userId, pId, actionPlan);

      return res.status(200).json({
        success: true,
        message: executionResult.message,
        data: {
          schema: executionResult.schema,
          summary: executionResult.summary
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AIController();
