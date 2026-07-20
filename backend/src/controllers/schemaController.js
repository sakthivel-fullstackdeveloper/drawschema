const schemaService = require('../services/schemaService');

class SchemaController {
  // Schema operations
  async getSchema(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const userId = req.user.id;
      const schema = await schemaService.getSchema(projectId, userId);

      res.status(200).json({
        success: true,
        message: 'Schema retrieved successfully',
        data: schema
      });
    } catch (error) {
      next(error);
    }
  }

  // Table operations
  async createTable(req, res, next) {
    try {
      const userId = req.user.id;
      const table = await schemaService.createTable(userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Table created successfully',
        data: { table }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTable(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const table = await schemaService.updateTable(userId, id, req.body);

      res.status(200).json({
        success: true,
        message: 'Table updated successfully',
        data: { table }
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTable(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user.id;
      await schemaService.deleteTable(userId, id);

      res.status(200).json({
        success: true,
        message: 'Table deleted successfully',
        data: { id }
      });
    } catch (error) {
      next(error);
    }
  }

  // Column operations
  async createColumn(req, res, next) {
    try {
      const userId = req.user.id;
      const column = await schemaService.createColumn(userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Column created successfully',
        data: { column }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateColumn(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const column = await schemaService.updateColumn(userId, id, req.body);

      res.status(200).json({
        success: true,
        message: 'Column updated successfully',
        data: { column }
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteColumn(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user.id;
      await schemaService.deleteColumn(userId, id);

      res.status(200).json({
        success: true,
        message: 'Column deleted successfully',
        data: { id }
      });
    } catch (error) {
      next(error);
    }
  }

  // Relationship operations
  async createRelationship(req, res, next) {
    try {
      const userId = req.user.id;
      const relationship = await schemaService.createRelationship(userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Relationship created successfully',
        data: { relationship }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateRelationship(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const relationship = await schemaService.updateRelationship(userId, id, req.body);

      res.status(200).json({
        success: true,
        message: 'Relationship updated successfully',
        data: { relationship }
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteRelationship(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user.id;
      await schemaService.deleteRelationship(userId, id);

      res.status(200).json({
        success: true,
        message: 'Relationship deleted successfully',
        data: { id }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SchemaController();
