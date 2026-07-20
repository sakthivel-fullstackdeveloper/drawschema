const { Project } = require('../models');

class ProjectRepository {
  async findAllByUserId(userId) {
    const projects = await Project.findAll({
      where: { user_id: userId },
      attributes: ['id', 'name', 'created_at', 'updated_at'],
      order: [['updated_at', 'DESC']]
    });
    return projects.map(p => p.toJSON());
  }

  async findById(id) {
    const project = await Project.findByPk(id);
    return project ? project.toJSON() : null;
  }

  async create(projectData, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const { userId, name } = projectData;
    const project = await Project.create({ user_id: userId, name }, options);
    return { id: project.id, userId: project.user_id, name: project.name };
  }

  async update(id, name, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const [affectedRows] = await Project.update(
      { name, updated_at: new Date() },
      { where: { id }, ...options }
    );
    return affectedRows > 0;
  }

  async delete(id, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const affectedRows = await Project.destroy({
      where: { id },
      ...options
    });
    return affectedRows > 0;
  }
}

module.exports = new ProjectRepository();
