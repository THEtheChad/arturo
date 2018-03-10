module.exports = function (sequelize, DataTypes) {
  const Watcher = sequelize.define('Watcher', {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    route: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    digest: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  })

  return Watcher
}
