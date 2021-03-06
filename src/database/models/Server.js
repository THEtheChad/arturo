module.exports = function (sequelize, DataTypes) {
  const Server = sequelize.define('Server', {
    host: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    domain: DataTypes.STRING,
    port: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    pid: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    keepAlive: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      set: function () {
        this.setDataValue('keepAlive', new Date)
      }
    },
  })

  Server.associate = function ({ Server, Worker }) {
    Server.hasMany(Worker, { foreignKey: 'serverId' })
    Worker.belongsTo(Server, { foreignKey: 'serverId' })
  }

  return Server;
}
