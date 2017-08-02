'use strict';

const os = require('os');

module.exports = function(sequelize, DataTypes) {
  return sequelize.define(
    'job',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      host: {
        type: DataTypes.STRING,
        defaultValue: os.hostname()
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false
      },
      max_attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 10
      },
      attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: 'schedule'
      },
      ttl: {
        type: DataTypes.INTEGER,
        defaultValue: 0x6ddd00, // 2 hours
        comment: 'in milliseconds'
      },
      scheduling: {
        type: DataTypes.STRING,
        defaultValue: 'exponential'
      },
      payload: {
        type: DataTypes.STRING,
        defaultValue: null
      },
      message: {
        type: DataTypes.STRING,
        defaultValue: null
      },
      keep_alive: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      date_created: {
        type: DataTypes.DATE
      },
      date_updated: {
        type: DataTypes.DATE
      },
      scheduled: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'job',
      timestamps: true,
      underscored: true,
      createdAt: 'date_created',
      updatedAt: 'date_updated'
    }
  );
};
