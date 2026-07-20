const { Table } = require('../models');

class TableRepository {
  async findAllByProjectId(projectId, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const tables = await Table.findAll({
      where: { project_id: projectId },
      attributes: ['id', 'name', 'x', 'y', 'width', 'height', 'color', 'created_at'],
      order: [['id', 'ASC']],
      ...options
    });
    return tables.map(t => t.toJSON());
  }

  async findById(id) {
    const table = await Table.findByPk(id);
    return table ? table.toJSON() : null;
  }

  async findByName(projectId, name) {
    const table = await Table.findOne({
      where: { project_id: projectId, name }
    });
    return table ? table.toJSON() : null;
  }

  async create(tableData, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const { projectId, name, x, y, width, height, color } = tableData;
    const table = await Table.create({
      project_id: projectId,
      name,
      x: x || 0,
      y: y || 0,
      width: width || 220,
      height: height || 200,
      color: color || '#3b82f6'
    }, options);
    return {
      id: table.id,
      projectId: table.project_id,
      name: table.name,
      x: table.x,
      y: table.y,
      width: table.width,
      height: table.height,
      color: table.color
    };
  }

  async update(id, data, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.x !== undefined) updateData.x = data.x;
    if (data.y !== undefined) updateData.y = data.y;
    if (data.width !== undefined) updateData.width = data.width;
    if (data.height !== undefined) updateData.height = data.height;
    if (data.color !== undefined) updateData.color = data.color;

    if (Object.keys(updateData).length === 0) return true;

    const [affectedRows] = await Table.update(updateData, {
      where: { id },
      ...options
    });
    return affectedRows > 0;
  }

  async delete(id, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const affectedRows = await Table.destroy({
      where: { id },
      ...options
    });
    return affectedRows > 0;
  }
}

module.exports = new TableRepository();
