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
    const user = await User.create(userData, options);
    return { id: user.id, name: user.name, email: user.email, is_google: user.is_google };
  }


  async updateOtp(id, otpCode, otpExpiresAt) {
    await User.update(
      { otp_code: otpCode, otp_expires_at: otpExpiresAt },
      { where: { id } }
    );
  }

  async update(id, updateData) {
    await User.update(updateData, { where: { id } });
    return this.findById(id);
  }
}

module.exports = new UserRepository();
