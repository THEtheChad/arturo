import Debug from 'debug'
import Actor from '../utilities/Actor'
const debug = Debug('arturo:job-runner')



let count = 0
export default class JobRunner extends Actor {
  constructor(sequelize, child) {
    super()

    this.uid = ++count
    this.pid = child.pid
    this.child = child
    this.sequelize = sequelize

    global.shutdown((code, sig) => new Promise(resolve => {
      this.destroy(null, () => {
        debug(`${this.constructor.name} ${this.uid} shutdown complete!`)
        resolve()
      })
    }))
  }

  async _compute(job) {
    const { child } = this
    debug(`${process.pid}:${child.pid} ${job.route}: processing job #${job.id}...`)

    if (this.destroyed) {
      this.push({ status: 'cancelled', job })
      return
    }

    if (!child.connected) {
      this.push({ status: 'failed', job, err: 'Worker Error' })
      return
    }

    return new Promise((resolve, reject) => {
      const handleExit = async (code, sig) => {
        clearListeners()
        debug(`handleExit ${code} ${sig} job #${job.id}`)
        await this._compute(job)
        resolve()
      }

      const handleMessage = (result) => {
        if (result.job.id !== job.id) return
        clearListeners()
        this.push(result)
        resolve()
      }

      const clearListeners = () => {
        child.removeListener('exit', handleExit)
        child.removeListener('message', handleMessage)
      }

      child.on('exit', handleExit)
      child.on('message', handleMessage)
      child.send({ type: 'job', job })
    })
  }

  _destroy(err, done) {
    console.log(`destroy ${this.uid} ${this.constructor.name}`)
    this.outbox().on('end', () => done())
    this.end()
    this.child.kill()
  }

  _final(done) {
    if (!this.destroyed) {
      this.child.send({ type: 'end' })
    }

    done()
  }
}