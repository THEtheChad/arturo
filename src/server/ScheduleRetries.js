import Debug from 'debug'
import Actor from '../utilities/Actor'
import Shutdown from '../server/Shutdown'

export default class ScheduleRetries extends Actor {
  constructor(sequelize, opts = {}) {
    super(opts)

    this.sequelize = sequelize
    this.strategies = [
      {
        name: 'exponential',
        schedule: (job) => job.scheduledDate.getTime() + Math.pow(job.interval, job.attempts)
      }
    ]
  }

  async _compute(job) {
    job.lastServer = global.server ? global.server.id : -1
    job.status = 'retry'
    job.lock = null

    const strategy = this.strategies.find(strategy => strategy.name === job.backoff)

    if (strategy) {
      job.scheduledDate = strategy.schedule(job)
    } else {
      const err = new Error('uknown backoff strategy')

      job.status = 'error'
      job.errorMsg = err.message
      job.errorId = this.logError(err)
    }

    try {
      await this.sequelize.models.Job.update(job, { where: { id: job.id } })
      this.debug(`job #${job.id} ${job.status}`)
    } catch (err) {
      console.error('DATABASE ERROR')
      console.error(err)
    }
  }
}