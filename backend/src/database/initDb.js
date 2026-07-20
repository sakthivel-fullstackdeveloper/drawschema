const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function initDb() {
  console.log('Connecting to MySQL server...');
  const dbName = process.env.DB_NAME || 'db_schema_designer';
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: dbName
  });

  try {
    console.log(`Connected to database ${dbName}. Initializing tables...`);

    console.log('Reading schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Strip comments line by line
    const cleanSql = schemaSql
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return !trimmed.startsWith('--') && !trimmed.startsWith('#');
      })
      .join('\n');

    // Split statements by semicolon
    const statements = cleanSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`Executing ${statements.length} DDL statements...`);
    for (const statement of statements) {
      const cleanStmt = statement.trim();
      
      // Skip database creation / USE statements since we handled them
      if (cleanStmt.toUpperCase().startsWith('CREATE DATABASE') || cleanStmt.toUpperCase().startsWith('USE ')) {
        continue;
      }
      
      console.log(`Executing: ${cleanStmt.substring(0, 40)}...`);
      await connection.query(cleanStmt);
    }

    console.log('✅ Database and tables initialized successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

initDb();
