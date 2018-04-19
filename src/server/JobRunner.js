import Shutdown from './Shutdown'
import Actor from '../utilities/Actor'

export default class JobRunner extends Actor {
  constructor(sequelize, child) {
    super()

    this.child = child
    this.sequelize = sequelize

    Shutdown.addHandler((code, sig) => new Promise(resolve => {
      this.on('end', () => {
        console.log(`${this.uuid} shutdown complete...`)
        resolve()
      })
      this.cancel = true
    }), (remover) => this.once('end', remover))

    this.on('error', err => {
      console.error(this.uuid)
      console.error(err)
    })
  }

  async _compute(job) {
    const { child } = this

    if (this.cancel) {
      this.debug(`${child.pid} cancelling job #${job.id}...`)
      job.status = 'cancelled'
      return this.push(job)
    }

    if (!child.connected) {
      this.debug(`${child.pid} worker unreachable: rescheduling job #${job.id}...`)
      const err = new Error('Worker Unreachable')

      job.status = 'failed'
      job.errorMsg = err.message
      job.errorId = this.logError(err)
      job.attempts = job.attempts + 1
      return this.push(job)
    }

    this.debug(`${child.pid} processing job #${job.id}...`)

    job.status = 'processing'
    job.attempts = job.attempts + 1
    job.startDate = new Date
    await this.sequelize.models.Job.update(job, { where: { id: job.id } })

    return new Promise((resolve, reject) => {
      const handleDisconnect = () => {
        clearListeners()
        this.debug(`${child.pid} worker failure: unable to finish job #${job.id}...`)
        const err = new Error('Worker Failure')

        job.status = 'failed'
        job.errorMsg = err.message
        job.errorId = this.logError(err)
        this.push(job)
        resolve()
      }

      const handleMessage = (result) => {
        if (result.id !== job.id) return
        clearListeners()
        this.push(result)
        resolve()
      }

      const clearListeners = () => {
        child.removeListener('disconnect', handleDisconnect)
        child.removeListener('message', handleMessage)
      }

      child.on('message', handleMessage)
      child.once('disconnect', handleDisconnect)
      child.send({ type: 'job', job })
    })
  }

  _final(done) {
    this.child.send({ type: 'end' })
    done()
  }
}