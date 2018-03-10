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

  Route.associate = function ({ Client, Route }) {
    Client.belongsToMany(Route, { through: 'ClientRoutes' })
    Route.belongsToMany(Client, { through: 'ClientRoutes' })
  }

  return Route
};
