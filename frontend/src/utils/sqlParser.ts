import type { DataType, RelationType, ReferentialRule } from '../types';

interface ParsedColumn {
  name: string;
  datatype: DataType;
  length: string | null;
  nullable: boolean;
  primaryKey: boolean;
  foreignKey: boolean;
  uniqueKey: boolean;
  autoIncrement: boolean;
  defaultValue: string | null;
  comment: string | null;
}

interface ParsedTable {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  columns: ParsedColumn[];
}

interface ParsedRelationship {
  fromTableName: string;
  fromColumnName: string;
  toTableName: string;
  toColumnName: string;
  relationType: RelationType;
  onDelete: ReferentialRule;
  onUpdate: ReferentialRule;
}

interface ParsedSchema {
  tables: ParsedTable[];
  relationships: ParsedRelationship[];
}

export const parseSQL = (sqlText: string): ParsedSchema => {
  const tables: ParsedTable[] = [];
  const relationships: ParsedRelationship[] = [];

  // 1. Pre-process SQL: remove comments
  let cleanSql = sqlText
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove /* ... */ comments
    .replace(/--.*$/gm, '')           // remove -- comments
    .replace(/^#.*$/gm, '')            // remove # comments
    .replace(/\s+/g, ' ')             // normalize whitespace
    .trim();

  // 2. Split by semicolons
  const statements = cleanSql.split(';');

  const colHeights = new Array(5).fill(100);
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

      const parsedColumns: ParsedColumn[] = [];
      const tablePrimaryKeys: string[] = [];
      const tableUniqueKeys: string[] = [];

      // Split inner contents by comma, but IGNORE commas inside parentheses
      const colStatements: string[] = [];
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
            
            let onDeleteRule: ReferentialRule = 'CASCADE';
            if (fkMatch[5]) {
              const rawDelete = fkMatch[5].toUpperCase().replace(/\s+/g, ' ');
              if (['CASCADE', 'RESTRICT', 'SET NULL', 'NO ACTION'].includes(rawDelete)) {
                onDeleteRule = rawDelete as ReferentialRule;
              }
            }

            let onUpdateRule: ReferentialRule = 'CASCADE';
            if (fkMatch[6]) {
              const rawUpdate = fkMatch[6].toUpperCase().replace(/\s+/g, ' ');
              if (['CASCADE', 'RESTRICT', 'SET NULL', 'NO ACTION'].includes(rawUpdate)) {
                onUpdateRule = rawUpdate as ReferentialRule;
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
          let lengthVal: string | null = null;

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
          
          let datatype: DataType = 'INT';
          if (baseSupportedTypes.includes(datatypeName)) {
            datatype = (datatypeName + (isArray ? '[]' : '')) as DataType;
          } else if (datatypeName === 'CHAR') {
            datatype = (isArray ? 'VARCHAR[]' : 'VARCHAR') as DataType;
          } else if (datatypeName === 'TINYINT' || datatypeName === 'SMALLINT' || datatypeName === 'MEDIUMINT') {
            datatype = (isArray ? 'INT[]' : 'INT') as DataType;
          } else if (datatypeName === 'LONGTEXT' || datatypeName === 'MEDIUMTEXT' || datatypeName === 'TINYTEXT') {
            datatype = (isArray ? 'TEXT[]' : 'TEXT') as DataType;
          } else {
            datatype = (isArray ? 'VARCHAR[]' : 'VARCHAR') as DataType;
          }

          let nullable = true;
          let primaryKey = false;
          let uniqueKey = false;
          let autoIncrement = false;
          let defaultValue: string | null = null;
          let comment: string | null = null;

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
      const colIdx = tableIndex % cols;
      const x = 100 + colIdx * 380;
      const y = colHeights[colIdx];

      const cardHeight = 100 + parsedColumns.length * 32;
      colHeights[colIdx] = y + cardHeight + 100; // y spacing buffer of 100px

      tables.push({
        id: tableName,
        name: tableName,
        x,
        y,
        width: 240,
        height: cardHeight,
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

        let onDeleteRule: ReferentialRule = 'CASCADE';
        if (alterMatch[5]) {
          const rawDelete = alterMatch[5].toUpperCase().replace(/\s+/g, ' ');
          if (['CASCADE', 'RESTRICT', 'SET NULL', 'NO ACTION'].includes(rawDelete)) {
            onDeleteRule = rawDelete as ReferentialRule;
          }
        }

        let onUpdateRule: ReferentialRule = 'CASCADE';
        if (alterMatch[6]) {
          const rawUpdate = alterMatch[6].toUpperCase().replace(/\s+/g, ' ');
          if (['CASCADE', 'RESTRICT', 'SET NULL', 'NO ACTION'].includes(rawUpdate)) {
            onUpdateRule = rawUpdate as ReferentialRule;
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

  if (tables.length === 0) {
    throw new Error('No valid CREATE TABLE statements detected. Please verify your SQL syntax (ensure all tables start with CREATE TABLE and statements end with a semicolon ";").');
  }

  return { tables, relationships };
};
