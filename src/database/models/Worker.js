module.exports = function (sequelize, DataTypes) {
  const Route = sequelize.define('Worker', {
    route: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    type: {
      type: DataTypes.STRING,
      defaultValue: 'local'
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  })

  Route.associate = function () { }

  return Route
};
