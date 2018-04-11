import Debug from 'debug'
import { fork } from 'child_process'
import Actor from '../utilities/Actor'
import JobRunner from './JobRunner'
import QueryScheduledJobs from '../queries/QueryScheduledJobs'

const debug = Debug('arturo:worker:execute')

export default class WorkerManager extends Actor {
  constructor(sequelize, opts) {
    super(function (worker) {
      debug(`${worker.route}: initializing`)
      const child = fork(worker.path)

      const promise = new Promise((resolve, reject) => {
        child
          .on('error', reject)
          .on('message', result => this.push(result))
          .on('disconnect', () => {
            debug(`${worker.route}: disconnected`)
            resolve()
          })
      })

      new JobRunner(sequelize, child, opts).inbox(new QueryScheduledJobs(sequelize, worker))

      return promise
    }, opts)
  }
}