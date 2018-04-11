module.exports = function (sequelize, DataTypes) {
  const Route = sequelize.define('Route', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
  }, {
      timestamps: false,
    })

  Route.associate = function () { }

  return Route
};
