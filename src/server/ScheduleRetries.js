import Update from '../utilities/Update'

export default class ScheduleRetries extends Update {
  constructor(opts = {}) {
    const strategies = [
      {
        name: 'exponential',
        schedule: (job) => job.scheduledDate.getTime() + Math.pow(job.interval, job.attempts)
      }
    ]

    super((instance, transaction) => {
      const updates = {
        lastServer: opts.server ? opts.server.id : -1,
        status: 'retry'
      }

      const strategy = strategies.find(strategy => strategy.name === instance.backoff)

      if (strategy) {
        updates.scheduledDate = strategy.schedule(instance)
      } else {
        updates.status = 'error'
        updates.error = 'uknown backoff strategy'
      }

      return instance.update(updates, { transaction })
    })
  }
}