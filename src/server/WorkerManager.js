import Debug from 'debug'
import { fork } from 'child_process'
import Actor from '../utilities/Actor'
import JobRunner from './JobRunner'
import QueryWorkerJobs from '../queries/QueryWorkerJobs'
import Promise from 'bluebird'

const debug = Debug('arturo:worker-manager')

export default class WorkerManager extends Actor {
  constructor(sequelize, opts) {
    super(opts)

    this.opts = opts
    this.sequelize = sequelize
    this.runners = []

    global.shutdown((code, sig) => new Promise(resolve => {
      this.destroy(null, () => {
        debug(`${this.constructor.name} shutdown complete!`)
        resolve()
      })
    }))
  }

  _compute(worker) {
    if (this.destroyed) return

    const child = fork(worker.path, [], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] })
    debug(`${process.pid}:${child.pid} ${worker.route}: initializing`)

    child
      .on('error', err => {
        debug(`${process.pid}:${child.pid} ${worker.route}: error ${err.message}`)
      })
      .once('exit', (code, sig) => {
        debug(`${process.pid}:${child.pid} ${worker.route}: exit ${code} ${sig}`)
      })
      .once('disconnect', () => {
        debug(`${process.pid}:${child.pid} ${worker.route}: disconnected`)
      })

    return new Promise((resolve, reject) => {
      const queue = new QueryWorkerJobs(this.sequelize, worker, this.opts)
      const runner = new JobRunner(this.sequelize, child, this.opts)

      this.runners.push(runner)
      runner.outbox().on('end', () => {
        const idx = this.runners.indexOf(runner)
        this.runners.splice(idx, 1)
        resolve()
      })
      runner.outbox(this.outbox())
      runner.inbox(queue, { end: true })
    })
  }

  async _destroy(err, done) {
    this.outbox().on('end', done)
    debug(`shutting down ${this.runners.length} job runners`)
    await Promise.map(this.runners, runner => new Promise(resolve => runner.outbox().on('end', resolve)))
    this.end()
  }
}