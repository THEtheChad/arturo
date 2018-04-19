import Debug from 'debug'
import Promise from 'bluebird'
import Actor from '../utilities/Actor'
import JobRunner from './JobRunner'
import JobUpdater from './JobUpdater'
import Queue from '../utilities/Queue'
import QueryWorkerJobs from '../queries/QueryWorkerJobs'
import Shutdown from '../server/Shutdown'
import Fork from '../utilities/Fork'

const debug = Debug('arturo:worker-manager')

export default class WorkerManager extends Actor {
  static QUEUE = new Fork

  constructor(sequelize, notifier, opts) {
    super(opts)

    this.sequelize = sequelize
    this.notifier = notifier

    Shutdown.addHandler((code, sig, done) => this.destroy(null, () => {
      console.log(`${this.uuid} shutdown complete...`)
      done()
    }))
  }

  _compute(worker) {
    if (this.destroyed) return

    const { path } = worker

    return Promise.map([true], () => new Promise(resolve => {
      WorkerManager.QUEUE.write({
        path,
        opts: { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] },
        onSpawn: (child) => {
          this.debug(`WORKER ${child.pid} ${worker.route}: initializing`)

          new QueryWorkerJobs(this.sequelize, worker)
            .pipe(new Queue)
            .pipe(new JobRunner(this.sequelize, child))
            .pipe(new JobUpdater(this.sequelize))
            .pipe(this.notifier, { end: false })
        },
        onDisconnect: (child) => this.debug(`WORKER ${child.pid} ${worker.route}: disconnected`),
        onError: (err, child) => this.debug(`WORKER ${child.pid} ${worker.route}: error ${err.message}`),
        onExit: (code, sig, child) => {
          this.debug(`WORKER ${child.pid} ${worker.route}: exit ${code} ${sig}`)
          resolve()
        },
      })
    }), { concurrency: 1 })
  }

  async _destroy(err, done) {
    WorkerManager.QUEUE.destroy(null, done)
  }
}