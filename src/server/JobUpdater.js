import Actor from '../utilities/Actor'

export default class JobUpdater extends Actor {
  constructor(sequelize, opts) {
    super(async function ({ status, job }) {
      const updates = {
        finishDate: new Date().toISOString()
      }

      updates.lastServer = opts.server ? opts.server.id : -1

      switch (status) {
        case 'completed': {
          updates.status = status
          break
        }

        case 'failed': {
          if (job.maxAttempts) {
            if (job.attempts >= job.maxAttempts) {
              updates.status = 'failed'
            }
          } else {
            updates.status = 'backoff'
          }
          break
        }

        default: {
          throw new Error(`unexpected job status ${status}`)
        }
      }

      await sequelize.models.Job
        .update(updates, { where: { id: job.id } })
    })
  }
}