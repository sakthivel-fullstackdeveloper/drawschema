const { runTransaction } = require('../config/db');
const projectRepository = require('../repositories/projectRepository');
const tableRepository = require('../repositories/tableRepository');
const columnRepository = require('../repositories/columnRepository');
const relationshipRepository = require('../repositories/relationshipRepository');

class ProjectService {
  async getProjects(userId) {
    return await projectRepository.findAllByUserId(userId);
  }

  async getProjectById(id, userId) {
    const project = await projectRepository.findById(id);
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

  async createProject(userId, name) {
    return await projectRepository.create({ userId, name });
  }

  async renameProject(id, userId, name) {
    // Validate project ownership
    await this.getProjectById(id, userId);
    return await projectRepository.update(id, name);
  }

  async deleteProject(id, userId) {
    // Validate project ownership
    await this.getProjectById(id, userId);
    return await projectRepository.delete(id);
  }

  async duplicateProject(id, userId) {
    const originalProject = await this.getProjectById(id, userId);
    
    // Duplicate project, tables, columns, and relationships in a transaction
    return await runTransaction(async (conn) => {
      // 1. Create duplicated project
      const dupProject = await projectRepository.create(
        { userId, name: `Copy of ${originalProject.name}` },
        conn
      );

      // 2. Fetch all original tables
      const originalTables = await tableRepository.findAllByProjectId(id);
      const tableIdMap = {}; // oldTableId -> newTableId

      // 3. Duplicate tables
      for (const table of originalTables) {
        const dupTable = await tableRepository.create(
          {
            projectId: dupProject.id,
            name: table.name,
            x: table.x,
            y: table.y,
            width: table.width,
            height: table.height,
            color: table.color
          },
          conn
        );
        tableIdMap[table.id] = dupTable.id;
      }

      // 4. Fetch all original columns for the project
      const originalColumns = await columnRepository.findAllByProjectId(id);
      const columnIdMap = {}; // oldColumnId -> newColumnId

      // 5. Duplicate columns
      for (const col of originalColumns) {
        const newTableId = tableIdMap[col.table_id];
        if (!newTableId) continue; // safety check

        const dupCol = await columnRepository.create(
          {
            tableId: newTableId,
            name: col.name,
            datatype: col.datatype,
            length: col.length,
            nullable: col.nullable,
            primaryKey: col.primary_key,
            foreignKey: col.foreign_key,
            uniqueKey: col.unique_key,
            autoIncrement: col.auto_increment,
            defaultValue: col.default_value,
            comment: col.comment
          },
          conn
        );
        columnIdMap[col.id] = dupCol.id;
      }

      // 6. Fetch all original relationships
      const originalRelationships = await relationshipRepository.findAllByProjectId(id);

      // 7. Duplicate relationships
      for (const rel of originalRelationships) {
        const fromTableId = tableIdMap[rel.from_table_id];
        const fromColumnId = columnIdMap[rel.from_column_id];
        const toTableId = tableIdMap[rel.to_table_id];
        const toColumnId = columnIdMap[rel.to_column_id];

        if (fromTableId && fromColumnId && toTableId && toColumnId) {
          await relationshipRepository.create(
            {
              projectId: dupProject.id,
              fromTableId,
              fromColumnId,
              toTableId,
              toColumnId,
              relationType: rel.relation_type,
              onDelete: rel.on_delete,
              onUpdate: rel.on_update
            },
            conn
          );
        }
      }

      return dupProject;
    });
  }
}

module.exports = new ProjectService();
