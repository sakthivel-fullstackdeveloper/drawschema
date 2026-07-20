const versionService = require('../services/versionService');

class VersionController {
  async createVersion(req, res, next) {
    try {
      const projectId = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const { name, description, isAutoSave } = req.body;

      const version = await versionService.createVersion(projectId, userId, {
        name,
        description,
        isAutoSave
      });

      res.status(201).json({
        success: true,
        message: 'Version snapshot created successfully',
        data: { version }
      });
    } catch (error) {
      next(error);
    }
  }

  async getVersions(req, res, next) {
    try {
      const projectId = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const type = req.query.type || 'all';

      const result = await versionService.getVersions(projectId, userId, page, limit, type);

      res.status(200).json({
        success: true,
        message: 'Versions retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getVersion(req, res, next) {
    try {
      const projectId = parseInt(req.params.id, 10);
      const versionId = parseInt(req.params.versionId, 10);
      const userId = req.user.id;

      const version = await versionService.getVersion(projectId, versionId, userId);

      res.status(200).json({
        success: true,
        message: 'Version retrieved successfully',
        data: { version }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateVersion(req, res, next) {
    try {
      const projectId = parseInt(req.params.id, 10);
      const versionId = parseInt(req.params.versionId, 10);
      const userId = req.user.id;
      const { name, description, isPinned } = req.body;

      const success = await versionService.updateVersion(projectId, versionId, userId, {
        name,
        description,
        isPinned
      });

      res.status(200).json({
        success: true,
        message: success ? 'Version updated successfully' : 'No changes made',
        data: { versionId }
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteVersion(req, res, next) {
    try {
      const projectId = parseInt(req.params.id, 10);
      const versionId = parseInt(req.params.versionId, 10);
      const userId = req.user.id;

      await versionService.deleteVersion(projectId, versionId, userId);

      res.status(200).json({
        success: true,
        message: 'Version deleted successfully',
        data: { versionId }
      });
    } catch (error) {
      next(error);
    }
  }

  async restoreVersion(req, res, next) {
    try {
      const projectId = parseInt(req.params.id, 10);
      const versionId = parseInt(req.params.versionId, 10);
      const userId = req.user.id;

      const restoredData = await versionService.restoreVersion(projectId, versionId, userId);

      res.status(200).json({
        success: true,
        message: 'Version restored successfully',
        data: restoredData
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VersionController();
