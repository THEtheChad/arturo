module.exports = function (sequelize, DataTypes) {
  return sequelize.define('Client', {
    host: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    keepAlive: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      set: function () { return this.setDataValue('keepAlive', new Date) }
    },
  })
};
