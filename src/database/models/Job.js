import os from 'os'
import EventEmitter from 'events'

async function proxy(fn, job) {
  const task = Promise.resolve(fn(job))
  const operations = [task]

  if (job.ttl) {
    const timeout = new Promise((resolve, reject) => {
      let timer = setTimeout(() => reject(new Error(`Time-to-live exceeded: ${job.ttl}ms`)), job.ttl)
      task.then(() => {
        clearTimeout(timer)
        resolve()
      })
    })
    operations.push(timeout)
  }

  await Promise.all(operations)
}

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
      type: DataTypes.JSON,
      defaultValue: {},
      allowNull: false,
    },
    origin: DataTypes.INTEGER,
    server: DataTypes.INTEGER,
    client: DataTypes.INTEGER,
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    maxAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
    },
    error: {
      type: DataTypes.STRING,
      defaultValue: null,
      allowNull: true,
    },
    ttl: {
      type: DataTypes.INTEGER,
      defaultValue: 0x6ddd00, // 2 hours
      comment: 'in milliseconds',
      allowNull: false,
    },
    backoff: {
      type: DataTypes.STRING,
      defaultValue: 'exponential',
      allowNull: false,
    },
    scheduledAt: {
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
      completed: function () {
        this.status = 'completed'
        return this.save()
      },

      failed: function (err, opts = {}) {
        if (err) this.error = err.message

        if (this.maxAttempts) {
          if (this.attempts >= this.maxAttempts) {
            opts.force = true
          }
        }

        this.status = opts.force ? 'failed' : 'backoff'

        return this.save()
      },

      assign: async function (worker) {
        this.status = 'processing'
        this.attempts++
        await this.save()

        this.emit('processing', this)
        try {
          await proxy(worker, this)
          await this.completed()
          this.emit('completed', this)
        }
        catch (err) {
          await this.failed(err)
          this.emit('failed', this)
        }
      }
    }
  )

  return Job
};
