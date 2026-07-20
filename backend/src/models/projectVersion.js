const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProjectVersion = sequelize.define('ProjectVersion', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    project_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    version_number: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    version_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    },
    snapshot_json: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
    is_compressed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    tables_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    relationships_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_pinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_auto_save: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'project_versions',
    timestamps: false
  });

  return ProjectVersion;
};
