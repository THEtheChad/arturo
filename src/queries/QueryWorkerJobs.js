import Debug from 'debug'
import stream from 'stream'
const debug = Debug('arturo:query:worker-jobs')

export default class QueryWorkerJobs extends stream.Readable {
  constructor(sequelize, worker, opts) {
    super({ objectMode: true })

    const { Op } = sequelize

    this.opts = opts
    this.sequelize = sequelize
    this.worker = worker
    this.where = {
      route: worker.route,
      status: ['scheduled', 'retry'],
      scheduledDate: { [Op.lte]: new Date },
    }

    this.sequelize.models.Job.count({ where: this.where })
      .then(count => debug(`found ${count} scheduled jobs for ${worker.route}...`))

    // global.shutdown((code, sig) => new Promise(resolve => {
    //   this.destroy(null, (err) => {
    //     debug(`${this.constructor.name} shutdown complete!`)
    //     resolve()
    //   })
    // }))
  }

  async _read() {
    if (this.destroyed) return

    try {
      await this.sequelize.transaction(async transaction => {
        const instance = await this.sequelize.models.Job.findOne({
          where: this.where,
          lock: transaction.LOCK.UPDATE,
          transaction
        })

        if (instance) {
          await instance.update({
            attempts: instance.attempts + 1,
            status: 'processing',
            lastServer: global.server ? global.server.id : -1,
            startDate: new Date,
          }, { transaction })
          this.push(instance.toJSON())
        } else {
          this.push(null)
        }
      })
    } catch (err) {
      console.error('DATABASE ERROR')
      console.error(err)
    }
  }

  // async _destroy(err, done) {
  //   this.unpipe()
  //   let job
  //   while (job = this.read()) {
  //     const attempts = job.attempts - 1
  //     await this.sequelize.models.Job.update({
  //       attempts,
  //       status: attempts > 0 ? 'retry' : 'scheduled',
  //       lastServer: global.server ? global.server.id : -1,
  //       startDate: null,
  //     }, { where: { id: job.id } })
  //   }
  //   done()
  // }
}