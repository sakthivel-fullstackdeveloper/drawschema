const projectRepository = require('../repositories/projectRepository');
const tableRepository = require('../repositories/tableRepository');
const columnRepository = require('../repositories/columnRepository');
const relationshipRepository = require('../repositories/relationshipRepository');

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

    // Prevent Circular Relationships
    const relationships = await relationshipRepository.findAllByProjectId(projectId);
    
    // Build directed graph of dependencies:
    // A relationship fromTable -> toTable implies fromTable depends on toTable.
    // If adding fromTable -> toTable creates a path from toTable back to fromTable, it's a cycle.
    const graph = {};
    // Add existing relationships
    relationships.forEach(rel => {
      if (!graph[rel.from_table_id]) {
        graph[rel.from_table_id] = [];
      }
      graph[rel.from_table_id].push(rel.to_table_id);
    });

    // Check if path exists from toTableId to fromTableId
    if (this.hasPath(graph, toTableId, fromTableId)) {
      const error = new Error('Circular dependency detected. This relationship would create a loop between tables.');
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
}

module.exports = new SchemaService();
