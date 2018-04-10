module.exports = function (sequelize, DataTypes) {
  const Route = sequelize.define('Worker', {
    route: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      defaultValue: 'local'
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false,
    }
  }, {
      timestamps: false,
    })

  Route.associate = function ({ Worker, Server }) {
    Server.belongsToMany(Worker, { through: 'Server_Workers' })
    Worker.belongsToMany(Server, { through: 'Server_Workers' })
  }

  return Route
};
