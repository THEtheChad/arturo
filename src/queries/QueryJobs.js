import Debug from 'debug'
import stream from 'stream'
const debug = Debug('arturo:query:jobs')

export default class QueryJobs extends stream.Readable {
  constructor(sequelize, opts) {
    super({ objectMode: true })

    this.sequelize = sequelize
    this.model = sequelize.models.Job
  }

  async queue(where = {}) {
    if (this.readableLength > 0) return

    this.where = where
    const count = await this.model.count({ where })
    debug(`found ${count} ${this.model.name} ${JSON.stringify(this.where)}...`)

    if (count) this._read()
  }

  async _read() {
    try {
      const job = await this.sequelize.transaction(async transaction => {
        const instance = await this.model.findOne({
          where: this.where,
          lock: transaction.LOCK.UPDATE,
          transaction
        })

        if (instance) {
          return await instance.update({
            status: 'processing',
            previousStatus: instance.status,
          }, { transaction })
        }
      })

      if (job) this.push(job.toJSON())
    } catch (err) {
      console.error('DB ERROR')
      console.error(err)
    }
  }
}