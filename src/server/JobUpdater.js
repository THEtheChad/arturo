import Debug from 'debug'
import Actor from '../utilities/Actor'
import Shutdown from '../server/Shutdown'

export default class JobUpdater extends Actor {
  constructor(sequelize, opts = {}) {
    super(opts)

    this.sequelize = sequelize

    Shutdown.addHandler((code, sig) => new Promise(resolve => {
      this.once('finish', () => {
        console.log(`${this.uuid} shutdown complete...`)
        resolve()
      })
    }), (remover) => this.once('finish', remover))
  }

  async _compute(job) {
    job.lastServer = global.server ? global.server.id : -1
    job.lock = null

    switch (job.status) {
      case 'completed': {
        job.finishDate = new Date
        break
      }

      case 'failed': {
        if (!job.maxAttempts || job.attempts < job.maxAttempts) {
          job.status = 'backoff'
        }
        break
      }

      case 'cancelled': {
        job.status = (job.attempts <= 0) ? 'scheduled' : 'retry'
        break
      }

      default: {
        throw new Error(`unexpected job status ${job.status}`)
      }
    }

    try {
      await this.sequelize.models.Job.update(job, { where: { id: job.id } })
      this.debug(`job #${job.id} ${job.status}`)
      this.push(job)
    } catch (err) {
      console.error(`${this.uuid}: DATABASE ERROR`)
      console.error(err)
    }
  }
}