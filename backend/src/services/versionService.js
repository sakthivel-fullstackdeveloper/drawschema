const zlib = require('zlib');
const versionRepository = require('../repositories/versionRepository');
const projectRepository = require('../repositories/projectRepository');
const tableRepository = require('../repositories/tableRepository');
const columnRepository = require('../repositories/columnRepository');
const relationshipRepository = require('../repositories/relationshipRepository');
const { runTransaction } = require('../config/db');
const { Table, Column, Relationship } = require('../models');

class VersionService {
  // Compress JSON snapshot
  compressSnapshot(snapshotObj) {
    const jsonStr = JSON.stringify(snapshotObj);
    const compressed = zlib.gzipSync(Buffer.from(jsonStr));
    return compressed.toString('base64');
  }

  // Decompress JSON snapshot
  decompressSnapshot(base64Str) {
    const compressedBuffer = Buffer.from(base64Str, 'base64');
    const decompressed = zlib.gunzipSync(compressedBuffer);
    return JSON.parse(decompressed.toString('utf8'));
  }

  // Validate project ownership
  async validateOwnership(projectId, userId) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }
    if (project.user_id !== userId) {
      const error = new Error('Unauthorized access to project');
      error.statusCode = 403;
      throw error;
    }
    return project;
  }

  // Helper to fetch structured snapshot of current state
  async getProjectSnapshot(projectId, connection = null) {
    const tables = await tableRepository.findAllByProjectId(projectId, connection);
    const columns = await columnRepository.findAllByProjectId(projectId, connection);
    const relationships = await relationshipRepository.findAllByProjectId(projectId, connection);

    // Group columns by table_id
    const columnsByTable = {};
    columns.forEach((col) => {
      const tableId = col.table_id || col.tableId;
      if (!columnsByTable[tableId]) {
        columnsByTable[tableId] = [];
      }
      columnsByTable[tableId].push({
        id: col.id,
        name: col.name,
        datatype: col.datatype,
        length: col.length,
        nullable: !!(col.nullable === undefined ? true : col.nullable),
        primaryKey: !!(col.primary_key || col.primaryKey),
        foreignKey: !!(col.foreign_key || col.foreignKey),
        uniqueKey: !!(col.unique_key || col.uniqueKey),
        autoIncrement: !!(col.auto_increment || col.autoIncrement),
        defaultValue: col.default_value || col.defaultValue || null,
        comment: col.comment || null
      });
    });

    const structuredTables = tables.map((t) => ({
      id: t.id,
      name: t.name,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      color: t.color,
      columns: columnsByTable[t.id] || []
    }));

    const structuredRels = relationships.map((r) => ({
      id: r.id,
      fromTableId: r.from_table_id || r.fromTableId,
      fromColumnId: r.from_column_id || r.fromColumnId,
      toTableId: r.to_table_id || r.toTableId,
      toColumnId: r.to_column_id || r.toColumnId,
      relationType: r.relation_type || r.relationType,
      onDelete: r.on_delete || r.onDelete,
      onUpdate: r.on_update || r.onUpdate
    }));

    return {
      tables: structuredTables,
      relationships: structuredRels,
      viewport: {},
      projectSettings: {}
    };
  }

  // Create new version snapshot
  async createVersion(projectId, userId, data) {
    await this.validateOwnership(projectId, userId);
    
    const { name, description, isAutoSave } = data;

    // Get current state snapshot
    const snapshot = await this.getProjectSnapshot(projectId);
    const snapshotJson = this.compressSnapshot(snapshot);

    // If auto-save, skip creating a duplicate snapshot if schema hasn't changed
    if (isAutoSave) {
      const latest = await versionRepository.findLatestByProjectId(projectId);
      if (latest && latest.snapshot_json === snapshotJson) {
        return latest;
      }
    }

    const version = await runTransaction(async (connection) => {
      const versionNumber = await versionRepository.getNextVersionNumber(projectId, connection);
      
      const newVersion = await versionRepository.create({
        projectId,
        versionNumber,
        versionName: name || `Version ${versionNumber}`,
        description: description || '',
        snapshotJson,
        isCompressed: true,
        tablesCount: snapshot.tables.length,
        relationshipsCount: snapshot.relationships.length,
        isPinned: false,
        isAutoSave: !!isAutoSave,
        createdBy: userId
      }, connection);

      // Perform auto-save retention cleanup if this was auto-save
      if (isAutoSave) {
        const count = await versionRepository.getAutoSaveVersionsCount(projectId, connection);
        if (count > 20) {
          const excess = count - 20;
          await versionRepository.deleteOldestAutoSaves(projectId, excess, connection);
        }
      }

      return newVersion;
    });

    return version;
  }

  // Fetch list of versions (paginated)
  async getVersions(projectId, userId, page = 1, limit = 20, type = 'all') {
    await this.validateOwnership(projectId, userId);
    
    const offset = (page - 1) * limit;
    
    const [versions, total] = await Promise.all([
      versionRepository.findAllByProjectId(projectId, limit, offset, type),
      versionRepository.getCountByProjectId(projectId, type)
    ]);

    return { versions, total, page, limit };
  }

  // Fetch details of a single version
  async getVersion(projectId, versionId, userId) {
    await this.validateOwnership(projectId, userId);
    
    const version = await versionRepository.findById(versionId);
    if (!version || version.project_id !== projectId) {
      const error = new Error('Version not found');
      error.statusCode = 404;
      throw error;
    }

    // Decompress snapshot content
    let snapshot = null;
    if (version.snapshot_json) {
      if (version.is_compressed) {
        snapshot = this.decompressSnapshot(version.snapshot_json);
      } else {
        snapshot = JSON.parse(version.snapshot_json);
      }
    }

    return {
      id: version.id,
      versionNumber: version.version_number,
      versionName: version.version_name,
      description: version.description,
      isPinned: !!version.is_pinned,
      isAutoSave: !!version.is_auto_save,
      tablesCount: version.tables_count,
      relationshipsCount: version.relationships_count,
      createdAt: version.created_at,
      snapshot
    };
  }

  // Update name, description, or pinning flag
  async updateVersion(projectId, versionId, userId, data) {
    await this.validateOwnership(projectId, userId);

    const version = await versionRepository.findById(versionId);
    if (!version || version.project_id !== projectId) {
      const error = new Error('Version not found');
      error.statusCode = 404;
      throw error;
    }

    const payload = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.description !== undefined) payload.description = data.description;
    if (data.isPinned !== undefined) payload.isPinned = data.isPinned;

    const success = await versionRepository.update(versionId, payload);
    return success;
  }

  // Delete version snapshot
  async deleteVersion(projectId, versionId, userId) {
    await this.validateOwnership(projectId, userId);

    const version = await versionRepository.findById(versionId);
    if (!version || version.project_id !== projectId) {
      const error = new Error('Version not found');
      error.statusCode = 404;
      throw error;
    }

    if (version.is_pinned) {
      const error = new Error('Cannot delete a pinned version');
      error.statusCode = 400;
      throw error;
    }

    const success = await versionRepository.delete(versionId);
    return success;
  }

  // Restore version (transactional and error-safe)
  async restoreVersion(projectId, versionId, userId) {
    await this.validateOwnership(projectId, userId);

    const version = await versionRepository.findById(versionId);
    if (!version || version.project_id !== projectId) {
      const error = new Error('Version not found');
      error.statusCode = 404;
      throw error;
    }

    // Decompress snapshot details
    let snapshot = null;
    if (version.is_compressed) {
      snapshot = this.decompressSnapshot(version.snapshot_json);
    } else {
      snapshot = JSON.parse(version.snapshot_json);
    }

    // Validate structural integrity
    if (!snapshot || !Array.isArray(snapshot.tables) || !Array.isArray(snapshot.relationships)) {
      const error = new Error('Snapshot JSON structure is corrupted or invalid');
      error.statusCode = 400;
      throw error;
    }

    // Execute restore flow inside database transaction boundary
    const restoredData = await runTransaction(async (connection) => {
      // 1. Automatically create backup version of current state
      const currentSnapshot = await this.getProjectSnapshot(projectId, connection);
      const backupJson = this.compressSnapshot(currentSnapshot);
      const backupVersionNum = await versionRepository.getNextVersionNumber(projectId, connection);

      await versionRepository.create({
        projectId,
        versionNumber: backupVersionNum,
        versionName: `Auto-backup before restoring v${version.version_number}`,
        description: `Automatically created backup at restore time`,
        snapshotJson: backupJson,
        isCompressed: true,
        tablesCount: currentSnapshot.tables.length,
        relationshipsCount: currentSnapshot.relationships.length,
        isPinned: false,
        isAutoSave: true, // Auto save is clean
        createdBy: userId
      }, connection);

      // 2. Clear current elements under the project in 2 fast queries
      const options = connection ? { transaction: connection } : {};
      await Relationship.destroy({ where: { project_id: projectId }, ...options });
      await Table.destroy({ where: { project_id: projectId }, ...options });

      // 3. Bulk Reconstruct tables and columns
      const tableIdMap = {};
      const columnIdMap = {};

      const tablesToCreate = snapshot.tables.map(table => ({
        project_id: projectId,
        name: table.name,
        x: table.x,
        y: table.y,
        width: table.width,
        height: table.height,
        color: table.color
      }));

      if (tablesToCreate.length > 0) {
        const createdTables = await Table.bulkCreate(tablesToCreate, options);
        const columnsToCreate = [];

        for (let i = 0; i < createdTables.length; i++) {
          const newTable = createdTables[i];
          const origTable = snapshot.tables[i];

          tableIdMap[origTable.id] = newTable.id;

          if (origTable.columns && Array.isArray(origTable.columns)) {
            for (const col of origTable.columns) {
              columnsToCreate.push({
                table_id: newTable.id,
                name: col.name,
                datatype: col.datatype,
                length: col.length || null,
                nullable: col.nullable !== false,
                primary_key: col.primaryKey === true,
                foreign_key: col.foreignKey === true,
                unique_key: col.uniqueKey === true,
                auto_increment: col.autoIncrement === true,
                default_value: col.defaultValue || null,
                comment: col.comment || null,
                origColId: col.id
              });
            }
          }
        }

        if (columnsToCreate.length > 0) {
          const createdCols = await Column.bulkCreate(columnsToCreate, options);
          for (let i = 0; i < createdCols.length; i++) {
            const colRecord = createdCols[i];
            const origCol = columnsToCreate[i];
            columnIdMap[origCol.origColId] = colRecord.id;
          }
        }
      }

      // 4. Bulk Reconstruct relationships with mapped IDs
      const relsToCreate = [];
      for (const rel of snapshot.relationships) {
        const mappedFromTable = tableIdMap[rel.fromTableId];
        const mappedToTable = tableIdMap[rel.toTableId];
        const mappedFromCol = columnIdMap[rel.fromColumnId];
        const mappedToCol = columnIdMap[rel.toColumnId];

        if (mappedFromTable && mappedToTable && mappedFromCol && mappedToCol) {
          relsToCreate.push({
            project_id: projectId,
            from_table_id: mappedFromTable,
            from_column_id: mappedFromCol,
            to_table_id: mappedToTable,
            to_column_id: mappedToCol,
            relation_type: rel.relationType,
            on_delete: rel.onDelete || 'CASCADE',
            on_update: rel.onUpdate || 'CASCADE'
          });
        }
      }

      if (relsToCreate.length > 0) {
        await Relationship.bulkCreate(relsToCreate, { ...options, ignoreDuplicates: true });
      }

      // Return newly built structured model
      return this.getProjectSnapshot(projectId, connection);
    });

    return restoredData;
  }
}

module.exports = new VersionService();
