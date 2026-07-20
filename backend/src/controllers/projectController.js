const projectService = require('../services/projectService');

class ProjectController {
  async getProjects(req, res, next) {
    try {
      const userId = req.user.id;
      const projects = await projectService.getProjects(userId);

      res.status(200).json({
        success: true,
        message: 'Projects retrieved successfully',
        data: { projects }
      });
    } catch (error) {
      next(error);
    }
  }

  async getProject(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const project = await projectService.getProjectById(id, userId);

      res.status(200).json({
        success: true,
        message: 'Project retrieved successfully',
        data: { project }
      });
    } catch (error) {
      next(error);
    }
  }

  async createProject(req, res, next) {
    try {
      const { name } = req.body;
      const userId = req.user.id;
      const project = await projectService.createProject(userId, name);

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: { project }
      });
    } catch (error) {
      next(error);
    }
  }

  async renameProject(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const { name } = req.body;
      const userId = req.user.id;
      await projectService.renameProject(id, userId, name);

      res.status(200).json({
        success: true,
        message: 'Project renamed successfully',
        data: { id, name }
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteProject(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user.id;
      await projectService.deleteProject(id, userId);

      res.status(200).json({
        success: true,
        message: 'Project deleted successfully',
        data: { id }
      });
    } catch (error) {
      next(error);
    }
  }

  async duplicateProject(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const dupProject = await projectService.duplicateProject(id, userId);

      res.status(201).json({
        success: true,
        message: 'Project duplicated successfully',
        data: { project: dupProject }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProjectController();
