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
    route: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'scheduled',
      allowNull: false,
    },
    payload: {
      type: DataTypes.STRING,
      set: function (json) {
        const str = (json == null) ? null : JSON.stringify(json)
        this.setDataValue('payload', str)
      },
      get: function () {
        const str = this.getDataValue('payload')
        return JSON.parse(str)
      }
    },
    originClient: DataTypes.INTEGER,
    lastServer: DataTypes.INTEGER,
    lastClient: DataTypes.INTEGER,
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    maxAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 7,
    },
    error: {
      type: DataTypes.STRING,
      defaultValue: null,
      allowNull: true,
    },
    ttl: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0x6ddd00, // 2 hours
      comment: 'in milliseconds',
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
    initial: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    scheduled: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  })

  const _constructor = Job.constructor
  Job.constructor = function () {
    _constructor.apply(this, arguments)
    EventEmitter.constructor.call(this)
  }

  Object.assign(
    Job.prototype,
    EventEmitter.prototype,
    {
      completed: async function () {
        this.status = 'completed'
        await this.save()
        this.emit('completed', this)
      },

      failed: async function (err, opts = {}) {
        if (err) this.error = err.message || err

        if (this.maxAttempts) {
          if (this.attempts >= this.maxAttempts) {
            opts.force = true
          }
        }

        this.status = opts.force ? 'failed' : 'backoff'

        await this.save()
        this.emit('failed', this)
      },

      assign: async function (worker) {
        this.status = 'processing'
        this.attempts++
        await this.save()
        this.emit('processing', this)

        await new Promise(resolve => {
          const process = child_process.fork(worker.path)
          const operations = []
          process.on('message', (msg) => {
            const operation = msg.err ? this.failed(msg.err) : this.completed()
            operations.push(operation)
          })
          process.on('error', (err) => {
            const operation = this.failed(err.message)
            operations.push(operation)
          })
          process.on('exit', async (code) => {
            if (code) {
              const operation = this.failed('Worker failed to execute properly.')
              operations.push(operation)
            }
            await Promise.all(operations)
            resolve()
          })
          process.send(this.toJSON())
        })
      }
    }
  )

  return Job
};
