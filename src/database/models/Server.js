module.exports = function (sequelize, DataTypes) {
  const Server = sequelize.define('Server', {
    host: {
      type: DataTypes.STRING,
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
        console.log('setting value')
        this.setDataValue('keepAlive', new Date)
      }
    },
  })

  Server.associate = function ({ Server, Worker }) {
    Server.hasMany(Worker)
    Worker.belongsTo(Server)
  }

  return Server;
}
