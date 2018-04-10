import WorkerManager from '../worker/WorkerManager'
import JobManager from '../worker/JobManager'
import GetScheduledWorkers from './GetScheduledWorkers'

export default class ProcessScheduledJobs {
  constructor(sequelize) {
    this.sequelize = sequelize

    this.manager = new WorkerManager
    this.manager.pipe(new JobManager(sequelize))

    this.manager.results().on('data', result => {
      console.log(result)
    })
  }

  execute() {
    return new Promise((resolve, reject) => {
      const queue = new GetScheduledWorkers(this.sequelize)
      queue
        .on('error', reject)
        .on('end', () => resolve())
      this.manager.inbox(queue)
    })
  }
}