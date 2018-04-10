import stream from 'stream'

export default class UpdateJobs extends stream.Transform {
  constructor(sequelize) {
    super({ objectMode: true })

    this.sequelize = sequelize
    this.concurrency = 1
  }

  processResult(result) {

  }

  _transform(result, enc, next) {

  }
}