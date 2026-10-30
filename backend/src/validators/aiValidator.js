const { z } = require('zod');

// 1. Base Constants & Enums derived from existing repository models & frontend types
const SQL_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const SUPPORTED_DATATYPES = [
  'INT', 'INT[]',
  'BIGINT', 'BIGINT[]',
  'VARCHAR', 'VARCHAR[]',
  'TEXT', 'TEXT[]',
  'BOOLEAN', 'BOOLEAN[]',
  'DATE', 'DATE[]',
  'DATETIME', 'DATETIME[]',
  'TIMESTAMP', 'TIMESTAMP[]',
  'FLOAT', 'FLOAT[]',
  'DOUBLE', 'DOUBLE[]',
  'DECIMAL', 'DECIMAL[]',
  'JSON', 'JSON[]',
  'UUID', 'UUID[]',
  'ENUM', 'ENUM[]'
];

const SUPPORTED_RELATION_TYPES = [
  'OneToOne',
  'OneToMany',
  'ManyToOne',
  'ManyToMany'
];

const SUPPORTED_REFERENTIAL_ACTIONS = [
  'CASCADE',
  'SET NULL',
  'RESTRICT',
  'NO ACTION'
];

// Helper: identifier schema
const identifierSchema = z.string()
  .trim()
  .min(1, 'Identifier cannot be empty')
  .max(64, 'Identifier cannot exceed 64 characters')
  .regex(SQL_IDENTIFIER_REGEX, 'Identifier must start with a letter or underscore and contain only alphanumeric characters and underscores');

// 2. Column Definition Schema (for CREATE_TABLE and ADD_COLUMN)
const columnDefinitionSchema = z.object({
  name: identifierSchema,
  datatype: z.enum(SUPPORTED_DATATYPES, {
    errorMap: (issue) => ({ message: `Unsupported datatype: '${issue.received || ''}'. Supported: ${SUPPORTED_DATATYPES.slice(0, 10).join(', ')}...` })
  }),
  length: z.string().trim().max(50).optional(),
  nullable: z.boolean().optional(),
  primaryKey: z.boolean().optional(),
  foreignKey: z.boolean().optional(),
  uniqueKey: z.boolean().optional(),
  autoIncrement: z.boolean().optional(),
  defaultValue: z.string().trim().max(255).optional(),
  comment: z.string().trim().max(255).optional()
}).strict('Unexpected properties in column definition');

// 3. Action Schemas

// CREATE_TABLE
const createTableActionSchema = z.object({
  type: z.literal('CREATE_TABLE'),
  name: identifierSchema,
  columns: z.array(columnDefinitionSchema)
    .min(1, 'A table must have at least one column')
    .max(100, 'A table cannot exceed 100 columns'),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid 6-character hex code').optional()
}).strict('Unexpected properties in CREATE_TABLE action');

// ADD_COLUMN
const addColumnActionSchema = z.object({
  type: z.literal('ADD_COLUMN'),
  tableName: identifierSchema,
  column: columnDefinitionSchema
}).strict('Unexpected properties in ADD_COLUMN action');

// RENAME_COLUMN
const renameColumnActionSchema = z.object({
  type: z.literal('RENAME_COLUMN'),
  tableName: identifierSchema,
  oldColumnName: identifierSchema,
  newColumnName: identifierSchema
}).strict('Unexpected properties in RENAME_COLUMN action')
  .refine(data => data.oldColumnName !== data.newColumnName, {
    message: 'New column name must be different from old column name',
    path: ['newColumnName']
  });

// UPDATE_COLUMN updates sub-object
const columnUpdatesSchema = z.object({
  datatype: z.enum(SUPPORTED_DATATYPES).optional(),
  length: z.string().trim().max(50).optional(),
  nullable: z.boolean().optional(),
  primaryKey: z.boolean().optional(),
  foreignKey: z.boolean().optional(),
  uniqueKey: z.boolean().optional(),
  autoIncrement: z.boolean().optional(),
  defaultValue: z.string().trim().max(255).optional(),
  comment: z.string().trim().max(255).optional()
}).strict('Unexpected properties in column updates object')
  .refine(updates => Object.keys(updates).length > 0, {
    message: 'At least one column property update must be provided'
  });

// UPDATE_COLUMN
const updateColumnActionSchema = z.object({
  type: z.literal('UPDATE_COLUMN'),
  tableName: identifierSchema,
  columnName: identifierSchema,
  updates: columnUpdatesSchema
}).strict('Unexpected properties in UPDATE_COLUMN action');

// CREATE_RELATIONSHIP
const createRelationshipActionSchema = z.object({
  type: z.literal('CREATE_RELATIONSHIP'),
  fromTable: identifierSchema,
  fromColumn: identifierSchema,
  toTable: identifierSchema,
  toColumn: identifierSchema,
  relationType: z.enum(SUPPORTED_RELATION_TYPES).default('OneToMany'),
  onDelete: z.enum(SUPPORTED_REFERENTIAL_ACTIONS).optional(),
  onUpdate: z.enum(SUPPORTED_REFERENTIAL_ACTIONS).optional()
}).strict('Unexpected properties in CREATE_RELATIONSHIP action');

// EXPLAIN_SCHEMA
const explainSchemaActionSchema = z.object({
  type: z.literal('EXPLAIN_SCHEMA'),
  focusTables: z.array(identifierSchema).max(50).optional()
}).strict('Unexpected properties in EXPLAIN_SCHEMA action');

// ANALYZE_SCHEMA
const analyzeSchemaActionSchema = z.object({
  type: z.literal('ANALYZE_SCHEMA')
}).strict('Unexpected properties in ANALYZE_SCHEMA action');

// 4. Discriminated Union of all supported actions
const aiActionSchema = z.discriminatedUnion('type', [
  createTableActionSchema,
  addColumnActionSchema,
  renameColumnActionSchema,
  updateColumnActionSchema,
  createRelationshipActionSchema,
  explainSchemaActionSchema,
  analyzeSchemaActionSchema
], {
  errorMap: () => ({ message: 'Unsupported or invalid action type' })
});

// 5. Complete AI Action Plan Schema (Enforces max 20 actions limit; allows empty array for conversational / greeting / Q&A turns)
// explanation max is 2000 chars — informational/how-to answers legitimately need more space than one-line confirmations.
const aiActionPlanSchema = z.object({
  explanation: z.string().trim().min(1, 'Explanation is required').max(2000).optional(),
  actions: z.array(aiActionSchema)
    .max(20, 'Cannot exceed 20 actions per command')
    .default([])
}).strict('Unexpected properties in action plan');

/**
 * Validates an AI action plan structurally using Zod.
 * Returns { success: true, data: validatedPlan } or { success: false, errors: string[] }
 */
function validateActionPlanStructure(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      success: false,
      errors: ['Action plan payload must be a non-null object']
    };
  }

  const result = aiActionPlanSchema.safeParse(payload);
  if (!result.success) {
    const issues = result.error.issues || result.error.errors || [];
    const formattedErrors = issues.map(err => {
      const path = err.path && err.path.length > 0 ? `[${err.path.join('.')}] ` : '';
      return `${path}${err.message}`;
    });
    return {
      success: false,
      errors: formattedErrors.length > 0 ? formattedErrors : [result.error.message]
    };
  }

  return {
    success: true,
    data: result.data
  };
}

/**
 * Validates a single action structurally using Zod.
 */
function validateSingleAction(action) {
  if (!action || typeof action !== 'object') {
    return {
      success: false,
      errors: ['Action must be a non-null object']
    };
  }

  const result = aiActionSchema.safeParse(action);
  if (!result.success) {
    const issues = result.error.issues || result.error.errors || [];
    const formattedErrors = issues.map(err => {
      const path = err.path && err.path.length > 0 ? `[${err.path.join('.')}] ` : '';
      return `${path}${err.message}`;
    });
    return {
      success: false,
      errors: formattedErrors.length > 0 ? formattedErrors : [result.error.message]
    };
  }

  return {
    success: true,
    data: result.data
  };
}

/**
 * Performs Semantic Validation against the current authoritative schema state.
 * 
 * Rules checked:
 * 1. Duplicate table names in project (existing or created in same plan).
 * 2. Duplicate column names in a table (existing or created in same plan).
 * 3. Target table existence for ADD_COLUMN, RENAME_COLUMN, UPDATE_COLUMN.
 * 4. Target column existence for RENAME_COLUMN, UPDATE_COLUMN.
 * 5. Column rename target must not clash with an existing column in the table.
 * 6. Source and target table & column existence for CREATE_RELATIONSHIP.
 * 7. Action dependency order: table/column must be created before being referenced by a relationship.
 * 
 * @param {Array} actions - Validated structural actions
 * @param {Object} currentSchema - { tables: Array<{ id, name, columns: Array<{ id, name, datatype }> }> }
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
function validateActionPlanSemantics(actions, currentSchema = { tables: [] }) {
  const errors = [];
  
  // Clone schema state to simulate dependency progression in memory
  // Map of lowercase table name -> Set of lowercase column names
  const simulatedSchema = new Map();

  // Populate from current schema
  if (Array.isArray(currentSchema.tables)) {
    for (const t of currentSchema.tables) {
      const colSet = new Set();
      if (Array.isArray(t.columns)) {
        for (const col of t.columns) {
          colSet.add(col.name.toLowerCase());
        }
      }
      simulatedSchema.set(t.name.toLowerCase(), colSet);
    }
  }

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const actionIndexStr = `Action #${i + 1} (${action.type})`;

    switch (action.type) {
      case 'CREATE_TABLE': {
        const lowerName = action.name.toLowerCase();
        if (simulatedSchema.has(lowerName)) {
          errors.push(`${actionIndexStr}: Table '${action.name}' already exists or was already defined earlier in this command.`);
          break;
        }

        const colSet = new Set();
        for (const col of action.columns) {
          const lowerColName = col.name.toLowerCase();
          if (colSet.has(lowerColName)) {
            errors.push(`${actionIndexStr}: Duplicate column '${col.name}' declared in table '${action.name}'.`);
          } else {
            colSet.add(lowerColName);
          }
        }

        simulatedSchema.set(lowerName, colSet);
        break;
      }

      case 'ADD_COLUMN': {
        const lowerTableName = action.tableName.toLowerCase();
        const existingTableCols = simulatedSchema.get(lowerTableName);

        if (!existingTableCols) {
          errors.push(`${actionIndexStr}: Cannot add column '${action.column.name}' because table '${action.tableName}' does not exist.`);
          break;
        }

        const lowerColName = action.column.name.toLowerCase();
        if (existingTableCols.has(lowerColName)) {
          errors.push(`${actionIndexStr}: Column '${action.column.name}' already exists in table '${action.tableName}'.`);
          break;
        }

        existingTableCols.add(lowerColName);
        break;
      }

      case 'RENAME_COLUMN': {
        const lowerTableName = action.tableName.toLowerCase();
        const existingTableCols = simulatedSchema.get(lowerTableName);

        if (!existingTableCols) {
          errors.push(`${actionIndexStr}: Cannot rename column because table '${action.tableName}' does not exist.`);
          break;
        }

        const lowerOldName = action.oldColumnName.toLowerCase();
        const lowerNewName = action.newColumnName.toLowerCase();

        if (!existingTableCols.has(lowerOldName)) {
          errors.push(`${actionIndexStr}: Column '${action.oldColumnName}' not found in table '${action.tableName}'.`);
          break;
        }

        if (existingTableCols.has(lowerNewName)) {
          errors.push(`${actionIndexStr}: Cannot rename '${action.oldColumnName}' to '${action.newColumnName}' because a column with that name already exists in table '${action.tableName}'.`);
          break;
        }

        existingTableCols.delete(lowerOldName);
        existingTableCols.add(lowerNewName);
        break;
      }

      case 'UPDATE_COLUMN': {
        const lowerTableName = action.tableName.toLowerCase();
        const existingTableCols = simulatedSchema.get(lowerTableName);

        if (!existingTableCols) {
          errors.push(`${actionIndexStr}: Cannot update column because table '${action.tableName}' does not exist.`);
          break;
        }

        const lowerColName = action.columnName.toLowerCase();
        if (!existingTableCols.has(lowerColName)) {
          errors.push(`${actionIndexStr}: Column '${action.columnName}' not found in table '${action.tableName}'.`);
        }
        break;
      }

      case 'CREATE_RELATIONSHIP': {
        const lowerFromTable = action.fromTable.toLowerCase();
        const lowerToTable = action.toTable.toLowerCase();

        const fromCols = simulatedSchema.get(lowerFromTable);
        const toCols = simulatedSchema.get(lowerToTable);

        if (!fromCols) {
          errors.push(`${actionIndexStr}: Source table '${action.fromTable}' does not exist.`);
        } else if (!fromCols.has(action.fromColumn.toLowerCase())) {
          errors.push(`${actionIndexStr}: Source column '${action.fromColumn}' does not exist in table '${action.fromTable}'.`);
        }

        if (!toCols) {
          errors.push(`${actionIndexStr}: Target table '${action.toTable}' does not exist.`);
        } else if (!toCols.has(action.toColumn.toLowerCase())) {
          errors.push(`${actionIndexStr}: Target column '${action.toColumn}' does not exist in table '${action.toTable}'.`);
        }
        break;
      }

      case 'EXPLAIN_SCHEMA': {
        if (Array.isArray(action.focusTables)) {
          for (const tbl of action.focusTables) {
            if (!simulatedSchema.has(tbl.toLowerCase())) {
              errors.push(`${actionIndexStr}: Focus table '${tbl}' does not exist in schema.`);
            }
          }
        }
        break;
      }

      case 'ANALYZE_SCHEMA':
        // Pure read-only inspection, always semantically valid
        break;

      default:
        errors.push(`${actionIndexStr}: Unknown action type.`);
        break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  // Enums & constants
  SQL_IDENTIFIER_REGEX,
  SUPPORTED_DATATYPES,
  SUPPORTED_RELATION_TYPES,
  SUPPORTED_REFERENTIAL_ACTIONS,

  // Zod Schemas
  columnDefinitionSchema,
  columnUpdatesSchema,
  createTableActionSchema,
  addColumnActionSchema,
  renameColumnActionSchema,
  updateColumnActionSchema,
  createRelationshipActionSchema,
  explainSchemaActionSchema,
  analyzeSchemaActionSchema,
  aiActionSchema,
  aiActionPlanSchema,

  // Validation Functions
  validateActionPlanStructure,
  validateSingleAction,
  validateActionPlanSemantics
};
