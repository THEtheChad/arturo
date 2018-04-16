import Update from '../utilities/Update'

export default class MarkForProcessing extends Update {
  constructor(child) {
    super(async (instance, transaction) => {
      debug(`${child.pid} processing job #${instance.id}...`)

      return instance.update({
        status: 'processing',
        attempts: instance.attempts + 1,
        startDate: new Date().toISOString(),
      }, { transaction })

      // pass job to worker and wait for response
      await new Promise((resolve, reject) => {
        function clear() {
          child.removeListener('exit', rewind)
          child.removeListener('message', listener)
        }

        async function rewind(code) {
          if (code !== 1) return
          debug(`${child.pid} rewinding job #${job.id}...`)
          clear()
          await update(job, { status: 'backoff' })
          reject()
        }

        function listener(msg) {
          if (msg.job.id !== job.id) return
          clear()
          resolve()
        }

        child.on('exit', rewind)
        child.on('message', listener)
        child.send({ type: 'job', job })
      })


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