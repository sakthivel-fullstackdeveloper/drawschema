const { Relationship } = require('../models');

class RelationshipRepository {
  async findAllByProjectId(projectId, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const relationships = await Relationship.findAll({
      where: { project_id: projectId },
      order: [['id', 'ASC']],
      ...options
    });
    return relationships.map(r => r.toJSON());
  }

  async findById(id) {
    const relationship = await Relationship.findByPk(id);
    return relationship ? relationship.toJSON() : null;
  }

  async create(relData, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const {
      projectId, fromTableId, fromColumnId, toTableId, toColumnId,
      relationType, onDelete, onUpdate
    } = relData;

    const relationship = await Relationship.create({
      project_id: projectId,
      from_table_id: fromTableId,
      from_column_id: fromColumnId,
      to_table_id: toTableId,
      to_column_id: toColumnId,
      relation_type: relationType,
      on_delete: onDelete || 'CASCADE',
      on_update: onUpdate || 'CASCADE'
    }, options);

    return relationship.toJSON();
  }

  async update(id, data, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const updateData = {};

    if (data.relationType !== undefined) updateData.relation_type = data.relationType;
    if (data.onDelete !== undefined) updateData.on_delete = data.onDelete;
    if (data.onUpdate !== undefined) updateData.on_update = data.onUpdate;

    if (Object.keys(updateData).length === 0) return true;

    const [affectedRows] = await Relationship.update(updateData, {
      where: { id },
      ...options
    });
    return affectedRows > 0;
  }

  async delete(id, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const affectedRows = await Relationship.destroy({
      where: { id },
      ...options
    });
    return affectedRows > 0;
  }
}

module.exports = new RelationshipRepository();
