import type { Table, Relationship } from '../types';

export const generateMySQL = (tables: Table[], relationships: Relationship[]): string => {
  let sql = `-- DrawSchema SQL Generator\n`;
  sql += `-- Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\n\n`;

  // Create mapping tables for easy lookups
  const tableMap = new Map<number, Table>();
  tables.forEach((t) => tableMap.set(t.id, t));

  const colMap = new Map<number, { tableName: string; colName: string }>();
  tables.forEach((t) => {
    t.columns.forEach((c) => {
      colMap.set(c.id, { tableName: t.name, colName: c.name });
    });
  });

  // 1. Disable foreign key checks temporarily during imports
  sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

  // 2. Generate CREATE TABLE queries
  tables.forEach((table) => {
    sql += `CREATE TABLE \`${table.name}\` (\n`;

    const columnDefs: string[] = [];

    // Columns definitions
    table.columns.forEach((col) => {
      const isArray = col.datatype.endsWith('[]');
      const rawBaseType = isArray ? col.datatype.slice(0, -2) : col.datatype;
      const baseType = rawBaseType.toUpperCase();
      
      // In MySQL DDL, array types (e.g. INT[], VARCHAR[]) and JSON types use 'JSON' without [] suffix or length specifiers
      let mysqlType = baseType;
      let lengthVal = col.length;

      if (isArray || baseType === 'JSON') {
        mysqlType = 'JSON';
        lengthVal = null; // MySQL JSON columns do not take length specifiers or [] suffix
      } else if (baseType === 'VARCHAR' && !lengthVal) {
        lengthVal = '255';
      } else if (baseType === 'ENUM' && (!lengthVal || lengthVal.trim() === '')) {
        lengthVal = "'default'";
      } else if (['TEXT', 'DATE', 'DATETIME', 'TIMESTAMP', 'BOOLEAN', 'UUID'].includes(baseType)) {
        lengthVal = null; // These types do not take length specifiers in MySQL
      }
      
      let colDef = `  \`${col.name}\` ${mysqlType}`;
      
      if (lengthVal) {
        colDef += `(${lengthVal})`;
      }

      // Nullable
      if (!col.nullable) {
        colDef += ` NOT NULL`;
      } else {
        colDef += ` NULL`;
      }

      // Auto Increment
      if (col.autoIncrement) {
        colDef += ` AUTO_INCREMENT`;
      }

      // Default Value
      // MySQL DDL Rule: JSON, TEXT, and BLOB columns cannot have DEFAULT clauses in MySQL 5.7 / 8.0
      const isJsonOrText = ['JSON', 'TEXT', 'LONGTEXT', 'MEDIUMTEXT', 'BLOB'].includes(baseType) || isArray;

      if (!isJsonOrText && col.defaultValue !== null && col.defaultValue !== undefined && col.defaultValue.trim() !== '') {
        const isStringOrDate = ['VARCHAR', 'DATE', 'DATETIME', 'TIMESTAMP', 'ENUM', 'UUID'].includes(baseType);
        const isUpperDefault = ['CURRENT_TIMESTAMP', 'NULL'].includes(col.defaultValue.toUpperCase());
        
        if (col.defaultValue.toUpperCase() !== 'NULL') {
          if (isStringOrDate && !isUpperDefault) {
            // Prevent double single-quoting if already quoted
            const cleanDefault = col.defaultValue.replace(/^'|'$/g, '');
            colDef += ` DEFAULT '${cleanDefault}'`;
          } else {
            colDef += ` DEFAULT ${col.defaultValue}`;
          }
        }
      }

      // Comment
      if (col.comment) {
        colDef += ` COMMENT '${col.comment.replace(/'/g, "\\'")}'`;
      }

      columnDefs.push(colDef);
    });

    // Primary Keys
    const pks = table.columns.filter((c) => c.primaryKey).map((c) => `\`${c.name}\``);
    if (pks.length > 0) {
      columnDefs.push(`  PRIMARY KEY (${pks.join(', ')})`);
    }

    // Unique Keys
    const uniques = table.columns.filter((c) => c.uniqueKey);
    uniques.forEach((u) => {
      columnDefs.push(`  UNIQUE KEY \`uq_${table.name}_${u.name}\` (\`${u.name}\`)`);
    });

    // Foreign Keys
    const tableRels = relationships.filter((r) => r.fromTableId === table.id);
    const addedFkKeys = new Set<string>();

    tableRels.forEach((rel, relIdx) => {
      const parentTable = tableMap.get(rel.toTableId);
      const childCol = table.columns.find((c) => c.id === rel.fromColumnId);
      const parentCol = parentTable?.columns.find((c) => c.id === rel.toColumnId);

      if (childCol && parentTable && parentCol) {
        // Prevent duplicate FK definitions on identical column pairs
        const fkPairKey = `${childCol.name}->${parentTable.name}.${parentCol.name}`;
        if (addedFkKeys.has(fkPairKey)) return;
        addedFkKeys.add(fkPairKey);

        const constraintName = `fk_${table.name}_${childCol.name}_${rel.id || relIdx + 1}`;
        let fkDef = `  CONSTRAINT \`${constraintName}\` FOREIGN KEY (\`${childCol.name}\`) REFERENCES \`${parentTable.name}\` (\`${parentCol.name}\`)`;
        
        if (rel.onDelete && rel.onDelete !== 'NO ACTION') {
          fkDef += ` ON DELETE ${rel.onDelete}`;
        }
        if (rel.onUpdate && rel.onUpdate !== 'NO ACTION') {
          fkDef += ` ON UPDATE ${rel.onUpdate}`;
        }
        
        columnDefs.push(fkDef);
      }
    });

    sql += columnDefs.join(',\n');
    sql += `\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;
  });

  // 3. Re-enable foreign key checks
  sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;

  return sql;
};
