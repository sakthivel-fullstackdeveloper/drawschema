const { User } = require('../models');

class UserRepository {
  async findByEmail(email) {
    const user = await User.findOne({ where: { email } });
    return user ? user.toJSON() : null;
  }

  async findById(id) {
    const user = await User.findByPk(id);
    return user ? user.toJSON() : null;
  }

  async create(userData, connection = null) {
    const options = connection ? { transaction: connection } : {};
    const { name, email, password } = userData;
    const user = await User.create({ name, email, password }, options);
    return { id: user.id, name: user.name, email: user.email };
  }
}

module.exports = new UserRepository();
