const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Relationship = sequelize.define('Relationship', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    project_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    from_table_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    from_column_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    to_table_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    to_column_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    relation_type: {
      type: DataTypes.STRING(50),
      defaultValue: 'OneToMany'
    },
    on_delete: {
      type: DataTypes.STRING(50),
      defaultValue: 'CASCADE'
    },
    on_update: {
      type: DataTypes.STRING(50),
      defaultValue: 'CASCADE'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'relationships',
    timestamps: false
  });

  return Relationship;
};
