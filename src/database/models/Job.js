import os from 'os'
import child_process from 'child_process'
import EventEmitter from 'events'

module.exports = function (sequelize, DataTypes) {
  const Job = sequelize.define('Job', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'scheduled',
      allowNull: false,
    },
    route: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    params: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '{}',
      set: function (json) {
        const str = (json == null) ? '{}' : JSON.stringify(json)
        this.setDataValue('params', str)
      },
      get: function () {
        const str = this.getDataValue('params')
        return JSON.parse(str)
      },
    },
    hash: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    maxAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 7,
    },
    ttl: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0x6ddd00, // 2 hours
      comment: 'in milliseconds',
    },
    error: {
      type: DataTypes.STRING,
      defaultValue: null,
      allowNull: true,
    },
    backoff: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'exponential',
    },
    interval: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
      comment: 'in milliseconds',
    },
    lastServer: DataTypes.INTEGER,
    scheduledDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    initialDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    startDate: type: DataTypes.DATE,
    finishDate: type: DataTypes.DATE,
  })

  Job.associate = function () { }

  return Job
};
