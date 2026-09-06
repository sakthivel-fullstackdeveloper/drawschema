const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    is_google: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    mfa_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },


    otp_code: {
      type: DataTypes.STRING(6),
      allowNull: true,
      defaultValue: null
    },
    otp_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'users',
    timestamps: false
  });

  return User;
};
