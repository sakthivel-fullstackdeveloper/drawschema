const { sequelize, Table, Column, Relationship } = require('../models');
const schemaService = require('./schemaService');
const {
  validateActionPlanStructure,
  validateActionPlanSemantics
} = require('../validators/aiValidator');

// Explicit allowlist of action types the AI execution service will ever execute.
// Any action type NOT in this list — including hypothetical destructive types like
// CLEAR_ALL_TABLES, DROP_TABLE, DELETE_COLUMN, etc. — is rejected at the backend
// regardless of how the request was formed or what the AI generated.
const ALLOWED_AI_ACTION_TYPES = new Set([
  'CREATE_TABLE',
  'ADD_COLUMN',
  'RENAME_COLUMN',
  'UPDATE_COLUMN',
  'CREATE_RELATIONSHIP',
  'EXPLAIN_SCHEMA',
  'ANALYZE_SCHEMA'
]);

class AIExecutionService {
  constructor() {
    // Project-level lock map to serialize concurrent/duplicate execution requests per project
    this.projectLocks = new Set();
  }

  /**
   * Executes a validated multi-action plan within an atomic Sequelize transaction.
   *
   * @param {number} userId - ID of authenticated user
   * @param {number} projectId - ID of project
   * @param {Object} actionPlan - { explanation: string, actions: Array<Object> }
   * @returns {Promise<{ success: boolean, schema: Object, summary: Object }>}
   */
  async executePlan(userId, projectId, actionPlan) {
    if (!actionPlan || !Array.isArray(actionPlan.actions)) {
      const err = new Error('Invalid action plan payload: actions array is required');
      err.statusCode = 400;
      throw err;
    }

    // 0. Server-side concurrency/duplicate request protection:
    // If an execution is already actively in progress for this project, reject duplicates immediately.
    const lockKey = `${userId}:${projectId}`;
    if (this.projectLocks.has(lockKey)) {
      const err = new Error('An AI execution is already in progress for this project. Please wait.');
      err.statusCode = 409; // Conflict
      throw err;
    }

    this.projectLocks.add(lockKey);

    try {
      // 1. Structural re-validation (defense-in-depth: never trust frontend input)
      const structResult = validateActionPlanStructure(actionPlan);
      if (!structResult.success) {
        const err = new Error(`Action plan structural validation failed: ${structResult.errors.join('; ')}`);
        err.statusCode = 422;
        err.details = structResult.errors;
        throw err;
      }

      const { actions } = structResult.data;

      // 2a. Allowlist enforcement — reject any action type not in ALLOWED_AI_ACTION_TYPES.
      // This is a backend security boundary: destructive operations (e.g. CLEAR_ALL_TABLES,
      // DROP_TABLE) cannot be executed through the AI execution path under any circumstances,
      // even if the frontend sends such a request directly.
      for (const action of actions) {
        if (!ALLOWED_AI_ACTION_TYPES.has(action.type)) {
          const err = new Error(
            `Action type '${action.type}' is not permitted through the AI execution service. ` +
            'Destructive schema operations must be performed through the manual UI workflow.'
          );
          err.statusCode = 403;
          throw err;
        }
      }

      // Filter out read-only actions for execution
      const mutationActions = actions.filter(
        a => a.type !== 'EXPLAIN_SCHEMA' && a.type !== 'ANALYZE_SCHEMA'
      );

      // 2. Authorize project ownership
      await schemaService.verifyProjectOwnership(projectId, userId);

      // 3. Execute all mutations inside a single atomic Sequelize transaction
      return await sequelize.transaction(async (t) => {
        // 4. Fetch authoritative current schema INSIDE the transaction to prevent stale checks / race conditions
        const currentSchema = await schemaService.getSchema(projectId, userId, t);

        // 5. Semantic re-validation against authoritative DB state
        const semanticResult = validateActionPlanSemantics(actions, currentSchema);
        if (!semanticResult.isValid) {
          const err = new Error(`Semantic validation failed against current schema: ${semanticResult.errors.join('; ')}`);
          err.statusCode = 422;
          err.details = semanticResult.errors;
          throw err;
        }

        // If only read-only actions were submitted, return without mutation
        if (mutationActions.length === 0) {
          return {
            success: true,
            message: 'Read-only action plan completed',
            schema: currentSchema,
            summary: {
              tablesCreated: 0,
              columnsAdded: 0,
              columnsRenamed: 0,
              columnsUpdated: 0,
              relationshipsCreated: 0
            }
          };
        }

        // 6. In-memory name-to-ID lookup caches initialized from DB state
        // Maps lowercased table name -> table ID
        const tableMap = new Map();
        // Maps lowercased "tableName.columnName" -> column ID
        const columnMap = new Map();

        // Populate lookup tables from authoritative schema
        for (const tbl of currentSchema.tables) {
          tableMap.set(tbl.name.toLowerCase(), tbl.id);
          for (const col of tbl.columns) {
            columnMap.set(`${tbl.name.toLowerCase()}.${col.name.toLowerCase()}`, col.id);
          }
        }

        // Calculate initial layout positions for new tables
        const existingCount = currentSchema.tables.length;
        let newTableOffset = 0;

        const summary = {
          tablesCreated: 0,
          columnsAdded: 0,
          columnsRenamed: 0,
          columnsUpdated: 0,
          relationshipsCreated: 0
        };

        // 7. Sequential Execution of Mutation Actions within transaction `t`
        for (let i = 0; i < mutationActions.length; i++) {
          const action = mutationActions[i];
          const step = `Action ${i + 1} (${action.type})`;

          switch (action.type) {
            case 'CREATE_TABLE': {
              const lowerTableName = action.name.toLowerCase();

              // Double check uniqueness inside transaction
              if (tableMap.has(lowerTableName)) {
                const err = new Error(`${step}: Table '${action.name}' already exists`);
                err.statusCode = 400;
                throw err;
              }

              // Grid layout calculation: 3 columns of tables, spacing 280x260
              const colIndex = (existingCount + newTableOffset) % 3;
              const rowIndex = Math.floor((existingCount + newTableOffset) / 3);
              const posX = 60 + colIndex * 280;
              const posY = 60 + rowIndex * 260;
              newTableOffset++;

              const newTable = await Table.create({
                project_id: projectId,
                name: action.name,
                x: posX,
                y: posY,
                width: 220,
                height: Math.max(160, 60 + action.columns.length * 32),
                color: action.color || '#3b82f6'
              }, { transaction: t });

              tableMap.set(lowerTableName, newTable.id);

              // Bulk create initial columns
              const colsToInsert = action.columns.map(c => ({
                table_id: newTable.id,
                name: c.name,
                datatype: c.datatype,
                length: c.length || null,
                nullable: c.nullable !== false,
                primary_key: c.primaryKey === true,
                foreign_key: c.foreignKey === true,
                unique_key: c.uniqueKey === true,
                auto_increment: c.autoIncrement === true,
                default_value: c.defaultValue || null,
                comment: c.comment || null
              }));

              const createdCols = await Column.bulkCreate(colsToInsert, {
                transaction: t,
                returning: true
              });

              // Update columnMap with created column records
              for (const colRec of createdCols) {
                columnMap.set(`${lowerTableName}.${colRec.name.toLowerCase()}`, colRec.id);
              }

              summary.tablesCreated++;
              break;
            }

            case 'ADD_COLUMN': {
              const lowerTableName = action.tableName.toLowerCase();
              const tableId = tableMap.get(lowerTableName);
              if (!tableId) {
                const err = new Error(`${step}: Table '${action.tableName}' not found`);
                err.statusCode = 404;
                throw err;
              }

              const lowerColName = action.column.name.toLowerCase();
              if (columnMap.has(`${lowerTableName}.${lowerColName}`)) {
                const err = new Error(`${step}: Column '${action.column.name}' already exists in table '${action.tableName}'`);
                err.statusCode = 400;
                throw err;
              }

              const newCol = await Column.create({
                table_id: tableId,
                name: action.column.name,
                datatype: action.column.datatype,
                length: action.column.length || null,
                nullable: action.column.nullable !== false,
                primary_key: action.column.primaryKey === true,
                foreign_key: action.column.foreignKey === true,
                unique_key: action.column.uniqueKey === true,
                auto_increment: action.column.autoIncrement === true,
                default_value: action.column.defaultValue || null,
                comment: action.column.comment || null
              }, { transaction: t });

              columnMap.set(`${lowerTableName}.${lowerColName}`, newCol.id);
              summary.columnsAdded++;
              break;
            }

            case 'RENAME_COLUMN': {
              const lowerTableName = action.tableName.toLowerCase();
              const oldKey = `${lowerTableName}.${action.oldColumnName.toLowerCase()}`;
              const colId = columnMap.get(oldKey);

              if (!colId) {
                const err = new Error(`${step}: Column '${action.oldColumnName}' not found in table '${action.tableName}'`);
                err.statusCode = 404;
                throw err;
              }

              const newKey = `${lowerTableName}.${action.newColumnName.toLowerCase()}`;
              if (columnMap.has(newKey)) {
                const err = new Error(`${step}: Column '${action.newColumnName}' already exists in table '${action.tableName}'`);
                err.statusCode = 400;
                throw err;
              }

              await Column.update(
                { name: action.newColumnName },
                { where: { id: colId }, transaction: t }
              );

              columnMap.delete(oldKey);
              columnMap.set(newKey, colId);
              summary.columnsRenamed++;
              break;
            }

            case 'UPDATE_COLUMN': {
              const lowerTableName = action.tableName.toLowerCase();
              const colKey = `${lowerTableName}.${action.columnName.toLowerCase()}`;
              const colId = columnMap.get(colKey);

              if (!colId) {
                const err = new Error(`${step}: Column '${action.columnName}' not found in table '${action.tableName}'`);
                err.statusCode = 404;
                throw err;
              }

              const updates = {};
              const allowed = {
                datatype: 'datatype',
                length: 'length',
                nullable: 'nullable',
                primaryKey: 'primary_key',
                foreignKey: 'foreign_key',
                uniqueKey: 'unique_key',
                autoIncrement: 'auto_increment',
                defaultValue: 'default_value',
                comment: 'comment'
              };

              for (const [prop, dbCol] of Object.entries(allowed)) {
                if (action.updates[prop] !== undefined) {
                  updates[dbCol] = action.updates[prop];
                }
              }

              if (Object.keys(updates).length > 0) {
                await Column.update(updates, {
                  where: { id: colId },
                  transaction: t
                });
              }

              summary.columnsUpdated++;
              break;
            }

            case 'CREATE_RELATIONSHIP': {
              const lowerFromTable = action.fromTable.toLowerCase();
              const lowerToTable = action.toTable.toLowerCase();
              const fromTableId = tableMap.get(lowerFromTable);
              const toTableId = tableMap.get(lowerToTable);

              if (!fromTableId) {
                const err = new Error(`${step}: Source table '${action.fromTable}' not found`);
                err.statusCode = 404;
                throw err;
              }
              if (!toTableId) {
                const err = new Error(`${step}: Target table '${action.toTable}' not found`);
                err.statusCode = 404;
                throw err;
              }

              const fromColKey = `${lowerFromTable}.${action.fromColumn.toLowerCase()}`;
              const toColKey = `${lowerToTable}.${action.toColumn.toLowerCase()}`;
              const fromColId = columnMap.get(fromColKey);
              const toColId = columnMap.get(toColKey);

              if (!fromColId) {
                const err = new Error(`${step}: Source column '${action.fromColumn}' not found in table '${action.fromTable}'`);
                err.statusCode = 404;
                throw err;
              }
              if (!toColId) {
                const err = new Error(`${step}: Target column '${action.toColumn}' not found in table '${action.toTable}'`);
                err.statusCode = 404;
                throw err;
              }

              await Relationship.create({
                project_id: projectId,
                from_table_id: fromTableId,
                from_column_id: fromColId,
                to_table_id: toTableId,
                to_column_id: toColId,
                relation_type: action.relationType || 'OneToMany',
                on_delete: action.onDelete || 'CASCADE',
                on_update: action.onUpdate || 'CASCADE'
              }, { transaction: t });

              // Mark the foreign key column
              await Column.update(
                { foreign_key: true },
                { where: { id: fromColId }, transaction: t }
              );

              summary.relationshipsCreated++;
              break;
            }

            default: {
              const err = new Error(`${step}: Unsupported action type '${action.type}'`);
              err.statusCode = 400;
              throw err;
            }
          }
        }

        // 8. Fetch authoritative updated schema inside transaction to return to client
        const updatedSchema = await schemaService.getSchema(projectId, userId, t);

        return {
          success: true,
          message: 'Action plan executed successfully',
          schema: updatedSchema,
          summary
        };
      });
    } finally {
      // Always release lock when finished or if an error is thrown
      this.projectLocks.delete(lockKey);
    }
  }
}

module.exports = new AIExecutionService();
