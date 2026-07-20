const { ProjectVersion } = require('../models');
const { Sequelize } = require('sequelize');

class VersionRepository {
  async getNextVersionNumber(projectId, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const maxVal = await ProjectVersion.max('version_number', {
      where: { project_id: projectId },
      ...options
    });
    return (maxVal || 0) + 1;
  }

  async create(versionData, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const {
      projectId,
      versionNumber,
      versionName,
      description,
      snapshotJson,
      isCompressed,
      tablesCount,
      relationshipsCount,
      isPinned,
      isAutoSave,
      createdBy
    } = versionData;

    const version = await ProjectVersion.create({
      project_id: projectId,
      version_number: versionNumber,
      version_name: versionName,
      description,
      snapshot_json: snapshotJson,
      is_compressed: isCompressed,
      tables_count: tablesCount,
      relationships_count: relationshipsCount,
      is_pinned: isPinned,
      is_auto_save: isAutoSave,
      created_by: createdBy
    }, options);

    return version.toJSON();
  }

  async findAllByProjectId(projectId, limit, offset, type = 'all', connection = null) {
    const options = connection ? { transaction: connection } : {};
    const whereClause = { project_id: projectId };

    if (type === 'manual') {
      whereClause.is_auto_save = false;
    } else if (type === 'pinned') {
      whereClause.is_pinned = true;
    } else if (type === 'auto') {
      whereClause.is_auto_save = true;
    }

    const versions = await ProjectVersion.findAll({
      where: whereClause,
      attributes: [
        'id', 'project_id', 'version_number', 'version_name', 'description',
        'is_compressed', 'tables_count', 'relationships_count', 'is_pinned',
        'is_auto_save', 'created_by', 'created_at'
      ],
      order: [['version_number', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      ...options
    });

    return versions.map(v => v.toJSON());
  }

  async getCountByProjectId(projectId, type = 'all', connection = null) {
    const options = connection ? { transaction: connection } : {};
    const whereClause = { project_id: projectId };

    if (type === 'manual') {
      whereClause.is_auto_save = false;
    } else if (type === 'pinned') {
      whereClause.is_pinned = true;
    } else if (type === 'auto') {
      whereClause.is_auto_save = true;
    }

    return await ProjectVersion.count({
      where: whereClause,
      ...options
    });
  }

  async findById(id, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const version = await ProjectVersion.findByPk(id, options);
    return version ? version.toJSON() : null;
  }

  async update(id, data, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const updateData = {};

    if (data.name !== undefined) updateData.version_name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isPinned !== undefined) updateData.is_pinned = data.isPinned;

    if (Object.keys(updateData).length === 0) return false;

    const [affectedRows] = await ProjectVersion.update(updateData, {
      where: { id },
      ...options
    });
    return affectedRows > 0;
  }

  async delete(id, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const affectedRows = await ProjectVersion.destroy({
      where: { id },
      ...options
    });
    return affectedRows > 0;
  }

  async getAutoSaveVersionsCount(projectId, connection = null) {
    const options = connection ? { transaction: connection } : {};
    return await ProjectVersion.count({
      where: {
        project_id: projectId,
        is_auto_save: true,
        is_pinned: false
      },
      ...options
    });
  }

  async deleteOldestAutoSaves(projectId, keepLimit, connection = null) {
    const options = connection ? { transaction: connection } : {};
    
    // Find the oldest autosaves
    const oldVersions = await ProjectVersion.findAll({
      where: {
        project_id: projectId,
        is_auto_save: true,
        is_pinned: false
      },
      attributes: ['id'],
      order: [['version_number', 'ASC']],
      limit: parseInt(keepLimit, 10),
      ...options
    });

    if (oldVersions.length === 0) return 0;

    const ids = oldVersions.map(v => v.id);
    return await ProjectVersion.destroy({
      where: { id: ids },
      ...options
    });
  }
}

module.exports = new VersionRepository();
