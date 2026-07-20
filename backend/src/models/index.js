const { sequelize } = require('../config/db');

const User = require('./user')(sequelize);
const Project = require('./project')(sequelize);
const Table = require('./table')(sequelize);
const Column = require('./column')(sequelize);
const Relationship = require('./relationship')(sequelize);
const ProjectVersion = require('./projectVersion')(sequelize);

// Associations
User.hasMany(Project, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Project.belongsTo(User, { foreignKey: 'user_id' });

Project.hasMany(Table, { foreignKey: 'project_id', onDelete: 'CASCADE' });
Table.belongsTo(Project, { foreignKey: 'project_id' });

Table.hasMany(Column, { foreignKey: 'table_id', onDelete: 'CASCADE' });
Column.belongsTo(Table, { foreignKey: 'table_id' });

Project.hasMany(Relationship, { foreignKey: 'project_id', onDelete: 'CASCADE' });
Relationship.belongsTo(Project, { foreignKey: 'project_id' });

Project.hasMany(ProjectVersion, { foreignKey: 'project_id', onDelete: 'CASCADE' });
ProjectVersion.belongsTo(Project, { foreignKey: 'project_id' });

module.exports = {
  sequelize,
  User,
  Project,
  Table,
  Column,
  Relationship,
  ProjectVersion
};
