import stream from 'stream'
import JobRunner from './JobRunner'
import GetScheduledJobs from '../readers/GetScheduledJobs'

export default class JobManager extends stream.Writable {
  constructor(sequelize) {
    super({ objectMode: true })
    this.sequelize = sequelize
  }

  _write(fork, enc, next) {
    new GetScheduledJobs(this.sequelize, fork)
      .pipe(new JobRunner(fork))
      .on('finish', () => next())
  }
}