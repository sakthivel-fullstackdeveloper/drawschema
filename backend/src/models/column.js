const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Column = sequelize.define('Column', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    table_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    datatype: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    length: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null
    },
    nullable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    primary_key: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    foreign_key: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    unique_key: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    auto_increment: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    default_value: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'columns',
    timestamps: false
  });

  return Column;
};
