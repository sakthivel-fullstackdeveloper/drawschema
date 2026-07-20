const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Table = sequelize.define('Table', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    project_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    x: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    y: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    width: {
      type: DataTypes.INTEGER,
      defaultValue: 220
    },
    height: {
      type: DataTypes.INTEGER,
      defaultValue: 200
    },
    color: {
      type: DataTypes.STRING(50),
      defaultValue: '#3b82f6'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'tables',
    timestamps: false
  });

  return Table;
};
