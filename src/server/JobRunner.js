import Actor from '../utilities/Actor'

export default class JobRunner extends Actor {
  constructor(sequelize, child, opts = { server: { id: -1 } }) {
    super(async function (job) {
      const updates = {
        status: 'processing',
        attempts: job.attempts + 1,
        startDate: new Date().toISOString(),
      }

      updates.lastServer = opts.server ? opts.server.id : -1

      // mark job as being processed
      // and increment attempts
      await sequelize.models.Job
        .update(updates, { where: { id: job.id } })

      // pass job to worker and wait for response
      await new Promise((resolve, reject) => {
        child.once('error', reject)
        child.on('message', function listener(msg) {
          if (msg.job.id !== job.id) return
          child.removeListener('message', listener)
          resolve()
        })
        child.send({ type: 'job', job })
      })

    })
  }
}