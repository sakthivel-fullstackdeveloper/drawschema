const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { sequelize, User, Project, Table, Column, Relationship } = require('../src/models');

// Parse DDL SQL to JSON schema
function parseSQL(sqlText) {
  const tables = [];
  const relationships = [];

  // 1. Pre-process SQL: remove comments
  let cleanSql = sqlText
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove /* ... */ comments
    .replace(/--.*$/gm, '')           // remove -- comments
    .replace(/^#.*$/gm, '')            // remove # comments
    .replace(/\s+/g, ' ')             // normalize whitespace
    .trim();

  // 2. Split by semicolons
  const statements = cleanSql.split(';');

  let tableIndex = 0;

  statements.forEach((rawStmt) => {
    const stmt = rawStmt.trim();
    if (!stmt) return;

    const upperStmt = stmt.toUpperCase();

    if (upperStmt.startsWith('CREATE TABLE')) {
      const createMatch = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[`"']?(\w+)[`"']?\.)?(?:[`"']?(\w+)[`"']?)\s*\(([\s\S]*)/i.exec(stmt);
      if (!createMatch) return;

      const tableName = createMatch[2];
      const rest = createMatch[3];
      const lastParen = rest.lastIndexOf(')');
      if (lastParen === -1) return;

      const columnsContent = rest.substring(0, lastParen);

      const parsedColumns = [];
      const tablePrimaryKeys = [];
      const tableUniqueKeys = [];

      // Split inner contents by comma, but IGNORE commas inside parentheses
      const colStatements = [];
      let currentStatement = '';
      let parenDepth = 0;
      let inQuote = false;
      let quoteChar = '';

      for (let i = 0; i < columnsContent.length; i++) {
        const char = columnsContent[i];

        if ((char === "'" || char === '"' || char === '`') && (i === 0 || columnsContent[i - 1] !== '\\')) {
          if (!inQuote) {
            inQuote = true;
            quoteChar = char;
          } else if (char === quoteChar) {
            inQuote = false;
          }
        }

        if (!inQuote) {
          if (char === '(') parenDepth++;
          if (char === ')') parenDepth--;
        }

        if (char === ',' && parenDepth === 0 && !inQuote) {
          colStatements.push(currentStatement.trim());
          currentStatement = '';
        } else {
          currentStatement += char;
        }
      }
      if (currentStatement.trim()) {
        colStatements.push(currentStatement.trim());
      }

      // Process column statements
      colStatements.forEach((colStmt) => {
        const upperColStmt = colStmt.toUpperCase();

        // Check for Table Constraints
        if (upperColStmt.startsWith('PRIMARY KEY')) {
          const pkMatch = /PRIMARY\s+KEY\s*\(([^)]+)\)/i.exec(colStmt);
          if (pkMatch) {
            const keys = pkMatch[1].split(',').map((k) => k.replace(/[`"'\s]/g, ''));
            tablePrimaryKeys.push(...keys);
          }
        } else if (upperColStmt.startsWith('UNIQUE KEY') || upperColStmt.startsWith('UNIQUE')) {
          const uqMatch = /UNIQUE\s*(?:KEY)?\s*(?:\w+)?\s*\(([^)]+)\)/i.exec(colStmt);
          if (uqMatch) {
            const keys = uqMatch[1].split(',').map((k) => k.replace(/[`"'\s]/g, ''));
            tableUniqueKeys.push(...keys);
          }
        } else if (upperColStmt.startsWith('CONSTRAINT') || upperColStmt.startsWith('FOREIGN KEY')) {
          // Table-level Foreign Key
          const fkMatch = /(?:CONSTRAINT\s+[`"']?(\w+)[`"']?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+[`"']?(\w+)[`"']?\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?(?:\s+ON\s+UPDATE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?/i.exec(colStmt);
          
          if (fkMatch) {
            const fromCol = fkMatch[2].replace(/[`"'\s]/g, '');
            const toTable = fkMatch[3].replace(/[`"'\s]/g, '');
            const toCol = fkMatch[4].replace(/[`"'\s]/g, '');
            
            let onDeleteRule = 'CASCADE';
            if (fkMatch[5]) {
              const rawDelete = fkMatch[5].toUpperCase().replace(/\s+/g, ' ');
              if (['CASCADE', 'RESTRICT', 'SET NULL', 'NO ACTION'].includes(rawDelete)) {
                onDeleteRule = rawDelete;
              }
            }

            let onUpdateRule = 'CASCADE';
            if (fkMatch[6]) {
              const rawUpdate = fkMatch[6].toUpperCase().replace(/\s+/g, ' ');
              if (['CASCADE', 'RESTRICT', 'SET NULL', 'NO ACTION'].includes(rawUpdate)) {
                onUpdateRule = rawUpdate;
              }
            }

            relationships.push({
              fromTableName: tableName,
              fromColumnName: fromCol,
              toTableName: toTable,
              toColumnName: toCol,
              relationType: 'OneToMany',
              onDelete: onDeleteRule,
              onUpdate: onUpdateRule
            });
          }
        } else if (upperColStmt.startsWith('KEY') || upperColStmt.startsWith('INDEX') || upperColStmt.startsWith('CHECK')) {
          // Ignore standard indexing keys
        } else {
          // Column Definition
          const colWords = colStmt.split(/\s+/);
          const colName = colWords[0].replace(/[`"']/g, '');

          if (!colName) return;

          let fullDatatype = colWords[1] || 'INT';
          let datatypeName = 'INT';
          let lengthVal = null;

          const isArray = /\[\]$/i.test(fullDatatype);
          const baseDatatype = fullDatatype.replace(/\[\]$/i, '');

          const typeMatch = /^(\w+)(?:\(([^)]+)\))?/i.exec(baseDatatype);
          if (typeMatch) {
            datatypeName = typeMatch[1].toUpperCase();
            lengthVal = typeMatch[2] || null;
          }

          const baseSupportedTypes = [
            'INT', 'BIGINT', 'VARCHAR', 'TEXT', 'BOOLEAN', 'DATE', 
            'DATETIME', 'TIMESTAMP', 'FLOAT', 'DOUBLE', 'DECIMAL', 
            'JSON', 'UUID', 'ENUM'
          ];
          
          let datatype = 'INT';
          if (baseSupportedTypes.includes(datatypeName)) {
            datatype = datatypeName + (isArray ? '[]' : '');
          } else if (datatypeName === 'CHAR') {
            datatype = isArray ? 'VARCHAR[]' : 'VARCHAR';
          } else if (datatypeName === 'TINYINT' || datatypeName === 'SMALLINT' || datatypeName === 'MEDIUMINT') {
            datatype = isArray ? 'INT[]' : 'INT';
          } else if (datatypeName === 'LONGTEXT' || datatypeName === 'MEDIUMTEXT' || datatypeName === 'TINYTEXT') {
            datatype = isArray ? 'TEXT[]' : 'TEXT';
          } else {
            datatype = isArray ? 'VARCHAR[]' : 'VARCHAR';
          }

          let nullable = true;
          let primaryKey = false;
          let uniqueKey = false;
          let autoIncrement = false;
          let defaultValue = null;
          let comment = null;

          const upperStmtDef = colStmt.toUpperCase();

          if (upperStmtDef.includes('NOT NULL')) {
            nullable = false;
          }
          if (upperStmtDef.includes('PRIMARY KEY')) {
            primaryKey = true;
          }
          if (upperStmtDef.includes('UNIQUE')) {
            uniqueKey = true;
          }
          if (upperStmtDef.includes('AUTO_INCREMENT')) {
            autoIncrement = true;
          }

          const defaultMatch = /DEFAULT\s+([^'\s]+|'[^']*')/i.exec(colStmt);
          if (defaultMatch) {
            defaultValue = defaultMatch[1].replace(/^'|'$/g, '');
          }

          const commentMatch = /COMMENT\s+'([^']*)'/i.exec(colStmt);
          if (commentMatch) {
            comment = commentMatch[1];
          }

          parsedColumns.push({
            name: colName,
            datatype,
            length: lengthVal,
            nullable,
            primaryKey,
            foreignKey: false,
            uniqueKey,
            autoIncrement,
            defaultValue,
            comment
          });
        }
      });

      parsedColumns.forEach((col) => {
        if (tablePrimaryKeys.includes(col.name)) {
          col.primaryKey = true;
        }
        if (tableUniqueKeys.includes(col.name)) {
          col.uniqueKey = true;
        }
      });

      const cols = 5;
      const gap = 300;
      const x = 100 + (tableIndex % cols) * gap;
      const y = 100 + Math.floor(tableIndex / cols) * 350;

      tables.push({
        name: tableName,
        x,
        y,
        width: 240,
        height: 100 + parsedColumns.length * 32,
        color: '#4f46e5',
        columns: parsedColumns
      });

      tableIndex++;
    } else if (upperStmt.startsWith('ALTER TABLE')) {
      // Parse ALTER TABLE ADD FOREIGN KEY statements
      const alterMatch = /ALTER\s+TABLE\s+[`"']?(\w+)[`"']?\s+ADD\s+(?:CONSTRAINT\s+[`"']?\w+[`"']?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+[`"']?(\w+)[`"']?\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?(?:\s+ON\s+UPDATE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?/i.exec(stmt);
      
      if (alterMatch) {
        const fromTable = alterMatch[1];
        const fromCol = alterMatch[2].replace(/[`"'\s]/g, '');
        const toTable = alterMatch[3].replace(/[`"'\s]/g, '');
        const toCol = alterMatch[4].replace(/[`"'\s]/g, '');

        let onDeleteRule = 'CASCADE';
        if (alterMatch[5]) {
          const rawDelete = alterMatch[5].toUpperCase().replace(/\s+/g, ' ');
          if (['CASCADE', 'RESTRICT', 'SET NULL', 'NO ACTION'].includes(rawDelete)) {
            onDeleteRule = rawDelete;
          }
        }

        let onUpdateRule = 'CASCADE';
        if (alterMatch[6]) {
          const rawUpdate = alterMatch[6].toUpperCase().replace(/\s+/g, ' ');
          if (['CASCADE', 'RESTRICT', 'SET NULL', 'NO ACTION'].includes(rawUpdate)) {
            onUpdateRule = rawUpdate;
          }
        }

        const exists = relationships.some(
          (r) =>
            r.fromTableName === fromTable &&
            r.fromColumnName === fromCol &&
            r.toTableName === toTable &&
            r.toColumnName === toCol
        );

        if (!exists) {
          relationships.push({
            fromTableName: fromTable,
            fromColumnName: fromCol,
            toTableName: toTable,
            toColumnName: toCol,
            relationType: 'OneToMany',
            onDelete: onDeleteRule,
            onUpdate: onUpdateRule
          });
        }
      }
    }
  });

  return { tables, relationships };
}

// Run the import workflow
async function run() {
  const defaultPath = path.join(__dirname, '../../beehub.sql');
  const sqlFilePath = process.argv[2] ? path.resolve(process.argv[2]) : defaultPath;
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`\x1b[31mError: SQL DDL file not found at: ${path.resolve(sqlFilePath)}\x1b[0m`);
    console.log('Please specify a valid SQL DDL file path or save it as "beehub.sql" in the root directory.');
    process.exit(1);
  }

  console.log('Reading beehub.sql...');
  const sqlText = fs.readFileSync(sqlFilePath, 'utf8');

  console.log('Parsing DDL Schema...');
  const parsed = parseSQL(sqlText);
  console.log(`Found ${parsed.tables.length} tables and ${parsed.relationships.length} relationships.`);

  // Connect to DB
  await sequelize.authenticate();
  console.log('Database connected successfully.');

  // Find user
  const user = await User.findOne();
  if (!user) {
    console.error('\x1b[31mError: No users found in database. Please register an account on the website first.\x1b[0m');
    process.exit(1);
  }
  console.log(`Seeding schema under user: ${user.email} (ID: ${user.id})`);

  // Create Project
  const project = await Project.create({
    name: 'BeeHub HRMS',
    user_id: user.id
  });
  console.log(`Created Project: "BeeHub HRMS" (ID: ${project.id})`);

  // Create tables & columns
  const tableIdMap = {};
  const columnIdMap = {};

  for (const t of parsed.tables) {
    const table = await Table.create({
      project_id: project.id,
      name: t.name,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      color: t.color
    });
    tableIdMap[t.name.toLowerCase()] = table.id;

    for (const c of t.columns) {
      const col = await Column.create({
        table_id: table.id,
        name: c.name,
        datatype: c.datatype,
        length: c.length || null,
        nullable: c.nullable ? 1 : 0,
        primary_key: c.primaryKey ? 1 : 0,
        foreign_key: c.foreignKey ? 1 : 0,
        unique_key: c.uniqueKey ? 1 : 0,
        auto_increment: c.autoIncrement ? 1 : 0,
        default_value: c.defaultValue || null,
        comment: c.comment || null
      });
      columnIdMap[`${t.name.toLowerCase()}.${c.name.toLowerCase()}`] = col.id;
    }
    console.log(`  Seeded table "${t.name}" with ${t.columns.length} columns.`);
  }

  // Create relationships
  let relCount = 0;
  for (const r of parsed.relationships) {
    const fromTableId = tableIdMap[r.fromTableName.toLowerCase()];
    const toTableId = tableIdMap[r.toTableName.toLowerCase()];
    const fromColumnId = columnIdMap[`${r.fromTableName.toLowerCase()}.${r.fromColumnName.toLowerCase()}`];
    const toColumnId = columnIdMap[`${r.toTableName.toLowerCase()}.${r.toColumnName.toLowerCase()}`];

    if (fromTableId && toTableId && fromColumnId && toColumnId) {
      await Relationship.create({
        project_id: project.id,
        from_table_id: fromTableId,
        from_column_id: fromColumnId,
        to_table_id: toTableId,
        to_column_id: toColumnId,
        relation_type: r.relationType || 'OneToMany',
        on_delete: r.onDelete || 'CASCADE',
        on_update: r.onUpdate || 'CASCADE'
      });

      // Mark column as foreign key
      await Column.update({ foreign_key: 1 }, { where: { id: fromColumnId } });
      relCount++;
    }
  }
  console.log(`Successfully seeded ${relCount} foreign key relationships.`);
  console.log('\n\x1b[32m✔ BeeHub HRMS Database Schema Seeded Successfully!\x1b[0m');
  console.log('You can now log in to the app, open the dashboard, and select the "BeeHub HRMS" project.');
  process.exit(0);
}

run().catch(err => {
  console.error('\x1b[31mSeed error:\x1b[0m', err);
  process.exit(1);
});
