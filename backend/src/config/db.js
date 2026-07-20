const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'db_schema_designer',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: false
    }
  }
);

/**
 * Execute a transaction using a Sequelize transaction callback.
 * Automatic commit and rollback are handled by Sequelize.
 * @param {function(any): Promise<any>} callback 
 * @returns {Promise<any>}
 */
async function runTransaction(callback) {
  return await sequelize.transaction(async (t) => {
    return await callback(t);
  });
}

module.exports = {
  sequelize,
  Sequelize,
  runTransaction,
  query: async (sql, params) => {
    const results = await sequelize.query({
      query: sql,
      values: params
    });
    // Return [rows, fields] to match mysql2 format
    return [results[0], results[1] || []];
  }
};
