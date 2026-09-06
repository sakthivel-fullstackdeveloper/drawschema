const projectRepository = require('../repositories/projectRepository');
const tableRepository = require('../repositories/tableRepository');
const columnRepository = require('../repositories/columnRepository');
const relationshipRepository = require('../repositories/relationshipRepository');
const { sequelize, Table, Column, Relationship } = require('../models');

class SchemaService {
  // Helper: check if user owns project
  async verifyProjectOwnership(projectId, userId) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }
    if (project.user_id !== userId) {
      const error = new Error('Unauthorized access');
      error.statusCode = 403;
      throw error;
    }
    return project;
  }

  // Helper: check if user owns table
  async verifyTableOwnership(tableId, userId) {
    const table = await tableRepository.findById(tableId);
    if (!table) {
      const error = new Error('Table not found');
      error.statusCode = 404;
      throw error;
    }
    await this.verifyProjectOwnership(table.project_id, userId);
    return table;
  }

  // Helper: check if user owns column
  async verifyColumnOwnership(columnId, userId) {
    const column = await columnRepository.findById(columnId);
    if (!column) {
      const error = new Error('Column not found');
      error.statusCode = 404;
      throw error;
    }
    await this.verifyTableOwnership(column.table_id, userId);
    return column;
  }

  // Helper: check if user owns relationship
  async verifyRelationshipOwnership(relationshipId, userId) {
    const relationship = await relationshipRepository.findById(relationshipId);
    if (!relationship) {
      const error = new Error('Relationship not found');
      error.statusCode = 404;
      throw error;
    }
    await this.verifyProjectOwnership(relationship.project_id, userId);
    return relationship;
  }

  // Get full schema
  async getSchema(projectId, userId) {
    await this.verifyProjectOwnership(projectId, userId);

    const tables = await tableRepository.findAllByProjectId(projectId);
    const columns = await columnRepository.findAllByProjectId(projectId);
    const relationships = await relationshipRepository.findAllByProjectId(projectId);

    // Group columns by table_id
    const columnsByTable = {};
    columns.forEach(col => {
      if (!columnsByTable[col.table_id]) {
        columnsByTable[col.table_id] = [];
      }
      columnsByTable[col.table_id].push({
        id: col.id,
        name: col.name,
        datatype: col.datatype,
        length: col.length,
        nullable: col.nullable === 1 || col.nullable === true,
        primaryKey: col.primary_key === 1 || col.primary_key === true,
        foreignKey: col.foreign_key === 1 || col.foreign_key === true,
        uniqueKey: col.unique_key === 1 || col.unique_key === true,
        autoIncrement: col.auto_increment === 1 || col.auto_increment === true,
        defaultValue: col.default_value,
        comment: col.comment
      });
    });

    const formattedTables = tables.map(t => ({
      id: t.id,
      name: t.name,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      color: t.color,
      columns: columnsByTable[t.id] || []
    }));

    const formattedRelationships = relationships.map(r => ({
      id: r.id,
      projectId: r.project_id,
      fromTableId: r.from_table_id,
      fromColumnId: r.from_column_id,
      toTableId: r.to_table_id,
      toColumnId: r.to_column_id,
      relationType: r.relation_type,
      onDelete: r.on_delete,
      onUpdate: r.on_update
    }));

    return {
      tables: formattedTables,
      relationships: formattedRelationships
    };
  }

  // Table operations
  async createTable(userId, tableData) {
    const { projectId, name, x, y, width, height, color } = tableData;
    await this.verifyProjectOwnership(projectId, userId);

    const existing = await tableRepository.findByName(projectId, name);
    if (existing) {
      const error = new Error(`Table name '${name}' already exists in this project`);
      error.statusCode = 400;
      throw error;
    }

    return await tableRepository.create({
      projectId, name, x, y, width, height, color
    });
  }

  async updateTable(userId, id, tableData) {
    const table = await this.verifyTableOwnership(id, userId);

    if (tableData.name && tableData.name !== table.name) {
      const existing = await tableRepository.findByName(table.project_id, tableData.name);
      if (existing) {
        const error = new Error(`Table name '${tableData.name}' already exists in this project`);
        error.statusCode = 400;
        throw error;
      }
    }

    const success = await tableRepository.update(id, tableData);
    if (!success) {
      throw new Error('Table update failed');
    }
    return await tableRepository.findById(id);
  }

  async deleteTable(userId, id) {
    await this.verifyTableOwnership(id, userId);
    return await tableRepository.delete(id);
  }

  // Column operations
  async createColumn(userId, columnData) {
    const { tableId, name } = columnData;
    const table = await this.verifyTableOwnership(tableId, userId);

    const existing = await columnRepository.findByName(tableId, name);
    if (existing) {
      const error = new Error(`Column '${name}' already exists in table '${table.name}'`);
      error.statusCode = 400;
      throw error;
    }

    return await columnRepository.create(columnData);
  }

  async updateColumn(userId, id, columnData) {
    const column = await this.verifyColumnOwnership(id, userId);

    if (columnData.name && columnData.name !== column.name) {
      const existing = await columnRepository.findByName(column.table_id, columnData.name);
      if (existing) {
        const error = new Error(`Column '${columnData.name}' already exists in this table`);
        error.statusCode = 400;
        throw error;
      }
    }

    const success = await columnRepository.update(id, columnData);
    if (!success) {
      throw new Error('Column update failed');
    }
    return await columnRepository.findById(id);
  }

  async deleteColumn(userId, id) {
    await this.verifyColumnOwnership(id, userId);
    return await columnRepository.delete(id);
  }

  // Relationship operations
  async createRelationship(userId, relData) {
    const { projectId, fromTableId, toTableId } = relData;
    await this.verifyProjectOwnership(projectId, userId);

    // Verify tables are in same project
    const fromTable = await tableRepository.findById(fromTableId);
    const toTable = await tableRepository.findById(toTableId);

    if (!fromTable || !toTable || fromTable.project_id !== projectId || toTable.project_id !== projectId) {
      const error = new Error('Tables do not belong to the same project');
      error.statusCode = 400;
      throw error;
    }

    return await relationshipRepository.create(relData);
  }

  async updateRelationship(userId, id, relData) {
    await this.verifyRelationshipOwnership(id, userId);
    const success = await relationshipRepository.update(id, relData);
    if (!success) {
      throw new Error('Relationship update failed');
    }
    return await relationshipRepository.findById(id);
  }

  async deleteRelationship(userId, id) {
    await this.verifyRelationshipOwnership(id, userId);
    return await relationshipRepository.delete(id);
  }

  // Cycle detection helper (DFS)
  hasPath(graph, start, target, visited = new Set()) {
    if (start === target) return true;
    if (!graph[start]) return false;

    visited.add(start);
    for (const neighbor of graph[start]) {
      if (!visited.has(neighbor)) {
        if (this.hasPath(graph, neighbor, target, visited)) {
          return true;
        }
      }
    }
    return false;
  }
  // Ultra-Optimized Single Bulk Schema Import inside MySQL Transaction
  async importSchema(userId, projectId, importData, mode = 'replace') {
    await this.verifyProjectOwnership(projectId, userId);

    const tablesData = importData.tables || [];
    const relationshipsData = importData.relationships || [];

    return await sequelize.transaction(async (t) => {
      if (mode === 'replace') {
        // Bulk delete all relationships and tables for project in 2 fast queries
        await Relationship.destroy({ where: { project_id: projectId }, transaction: t });
        await Table.destroy({ where: { project_id: projectId }, transaction: t });
      }

      const tableIdMap = {};
      const columnIdMap = {};

      let existingTables = [];
      let yOffset = 0;
      if (mode === 'extend') {
        existingTables = await tableRepository.findAllByProjectId(projectId, t);
        const existingCols = await columnRepository.findAllByProjectId(projectId, t);
        const maxY = existingTables.reduce((max, tbl) => Math.max(max, tbl.y + 240), 100);
        yOffset = maxY + 80;

        for (const tbl of existingTables) {
          tableIdMap[tbl.name.toLowerCase()] = tbl.id;
        }
        for (const col of existingCols) {
          const tbl = existingTables.find(tItem => tItem.id === col.table_id);
          if (tbl) {
            columnIdMap[`${tbl.name.toLowerCase()}.${col.name.toLowerCase()}`] = col.id;
          }
        }
      }

      const existingNames = new Set(existingTables.map((tbl) => tbl.name.toLowerCase()));
      const tablesToCreate = [];
      const tableDataMap = [];

      for (const tData of tablesData) {
        if (mode === 'extend' && existingNames.has(tData.name.toLowerCase())) {
          continue;
        }

        const tableY = (tData.y || 100) + (mode === 'extend' ? yOffset : 0);

        tablesToCreate.push({
          project_id: projectId,
          name: tData.name,
          x: tData.x || 100,
          y: tableY,
          width: tData.width || 220,
          height: tData.height || 180,
          color: tData.color || '#3b82f6'
        });
        tableDataMap.push(tData);
      }

      // 1. Bulk Insert ALL Tables in 1 single SQL query!
      if (tablesToCreate.length > 0) {
        const createdTables = await Table.bulkCreate(tablesToCreate, { transaction: t });
        const columnsToCreate = [];

        for (let i = 0; i < createdTables.length; i++) {
          const newTable = createdTables[i];
          const origTableData = tableDataMap[i];

          tableIdMap[String(origTableData.id).toLowerCase()] = newTable.id;
          tableIdMap[origTableData.name.toLowerCase()] = newTable.id;

          if (origTableData.columns && Array.isArray(origTableData.columns)) {
            for (const col of origTableData.columns) {
              columnsToCreate.push({
                table_id: newTable.id,
                name: col.name,
                datatype: col.datatype || 'INT',
                length: col.length || null,
                nullable: col.nullable !== false,
                primary_key: col.primaryKey === true,
                foreign_key: false,
                unique_key: col.uniqueKey === true,
                auto_increment: col.autoIncrement === true,
                default_value: col.defaultValue || null,
                comment: col.comment || null,
                tableName: origTableData.name.toLowerCase(),
                colName: col.name.toLowerCase()
              });
            }
          }
        }

        // 2. Bulk Insert ALL columns in 1 single SQL query!
        if (columnsToCreate.length > 0) {
          const createdCols = await Column.bulkCreate(columnsToCreate, { transaction: t });
          for (let i = 0; i < createdCols.length; i++) {
            const colRecord = createdCols[i];
            const orig = columnsToCreate[i];
            columnIdMap[`${orig.tableName}.${orig.colName}`] = colRecord.id;
          }
        }
      }

      const relsToCreate = [];
      const fkColumnIds = new Set();

      for (const rel of relationshipsData) {
        const fromTableNameStr = String(rel.fromTableName || '').toLowerCase();
        const toTableNameStr = String(rel.toTableName || '').toLowerCase();
        const fromColNameStr = String(rel.fromColumnName || '').toLowerCase();
        const toColNameStr = String(rel.toColumnName || '').toLowerCase();

        const fromTableId = tableIdMap[fromTableNameStr] || tableIdMap[String(rel.fromTableId).toLowerCase()];
        const toTableId = tableIdMap[toTableNameStr] || tableIdMap[String(rel.toTableId).toLowerCase()];
        const fromColumnId = columnIdMap[`${fromTableNameStr}.${fromColNameStr}`];
        const toColumnId = columnIdMap[`${toTableNameStr}.${toColNameStr}`];

        if (fromTableId && toTableId && fromColumnId && toColumnId) {
          relsToCreate.push({
            project_id: projectId,
            from_table_id: fromTableId,
            from_column_id: fromColumnId,
            to_table_id: toTableId,
            to_column_id: toColumnId,
            relation_type: rel.relationType || 'OneToMany',
            on_delete: rel.onDelete || 'CASCADE',
            on_update: rel.onUpdate || 'CASCADE'
          });
          fkColumnIds.add(fromColumnId);
        }
      }

      // 3. Bulk Insert ALL relationships in 1 single SQL query!
      if (relsToCreate.length > 0) {
        await Relationship.bulkCreate(relsToCreate, { transaction: t, ignoreDuplicates: true });
      }

      // 4. Bulk Update foreign_key flag on all foreign key columns in 1 single SQL query!
      if (fkColumnIds.size > 0) {
        await Column.update({ foreign_key: true }, {
          where: { id: Array.from(fkColumnIds) },
          transaction: t
        });
      }

      return await this.getSchema(projectId, userId);
    });
  }
}

module.exports = new SchemaService();
