const { Column, Table } = require('../models');

class ColumnRepository {
  async findAllByTableId(tableId, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const columns = await Column.findAll({
      where: { table_id: tableId },
      order: [['id', 'ASC']],
      ...options
    });
    return columns.map(c => c.toJSON());
  }

  async findAllByProjectId(projectId, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const columns = await Column.findAll({
      include: [{
        model: Table,
        required: true,
        where: { project_id: projectId },
        attributes: []
      }],
      order: [['table_id', 'ASC'], ['id', 'ASC']],
      ...options
    });
    return columns.map(c => c.toJSON());
  }

  async findById(id) {
    const column = await Column.findByPk(id);
    return column ? column.toJSON() : null;
  }

  async findByName(tableId, name) {
    const column = await Column.findOne({
      where: { table_id: tableId, name }
    });
    return column ? column.toJSON() : null;
  }

  async create(columnData, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const {
      tableId, name, datatype, length, nullable, primaryKey,
      foreignKey, uniqueKey, autoIncrement, defaultValue, comment
    } = columnData;

    const column = await Column.create({
      table_id: tableId,
      name,
      datatype,
      length: length || null,
      nullable: nullable === undefined ? true : nullable,
      primary_key: primaryKey || false,
      foreign_key: foreignKey || false,
      unique_key: uniqueKey || false,
      auto_increment: autoIncrement || false,
      default_value: defaultValue || null,
      comment: comment || null
    }, options);

    return column.toJSON();
  }

  async update(id, data, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const updateData = {};

    const allowedFields = {
      name: 'name',
      datatype: 'datatype',
      length: 'length',
      nullable: 'nullable',
      primaryKey: 'primary_key',
      foreignKey: 'foreign_key',
      uniqueKey: 'unique_key',
      autoIncrement: 'auto_increment',
      defaultValue: 'default_value',
      comment: 'comment'
    };

    for (const [key, modelProp] of Object.entries(allowedFields)) {
      if (data[key] !== undefined) {
        updateData[modelProp] = data[key];
      }
    }

    if (Object.keys(updateData).length === 0) return true;

    const [affectedRows] = await Column.update(updateData, {
      where: { id },
      ...options
    });
    return affectedRows > 0;
  }

  async delete(id, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const affectedRows = await Column.destroy({
      where: { id },
      ...options
    });
    return affectedRows > 0;
  }
}

module.exports = new ColumnRepository();
