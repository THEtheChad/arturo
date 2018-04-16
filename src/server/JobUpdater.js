import Debug from 'debug'
import Actor from '../utilities/Actor'
const debug = Debug('arturo:job-updater')

export default class JobUpdater extends Actor {
  constructor(sequelize, opts = {}) {
    super(opts)

    this.sequelize = sequelize

    global.shutdown((code, sig) => new Promise(resolve => {
      this.destroy(null, () => {
        debug(`${this.constructor.name} shutdown complete!`)
        resolve()
      })
    }))
  }

  async _compute({ status, job, err }) {
    const updates = {
      lastServer: global.server ? global.server.id : -1
    }

    switch (status) {
      case 'completed': {
        updates.status = status
        updates.finishDate = new Date
        break
      }

      case 'failed': {
        updates.error = err

        if (job.maxAttempts && job.attempts >= job.maxAttempts) {
          updates.status = 'failed'
        } else {
          updates.status = 'backoff'
        }
        break
      }

      case 'cancelled': {
        updates.status = 'scheduled'
        updates.attempts = job.attempts - 1
        break
      }

      default: {
        throw new Error(`unexpected job status ${status}`)
      }
    }

    try {
      const [count] = await this.sequelize.models.Job
        .update(updates, { where: { id: job.id } })
      debug(`${process.pid} ${job.route} ${count} job #${job.id} ${status}`)
    } catch (err) {
      console.error('DATABASE ERROR')
      console.error(err)
    }

    this.push(Object.assign({}, job, updates))
  }

  _destroy(err, done) {
    this.outbox().on('end', done)
  }
}