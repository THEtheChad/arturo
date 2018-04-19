import Debug from 'debug'
import stream from 'stream'
import uuid from '../utilities/uuid'
import Shutdown from '../server/Shutdown'

export default class QueryWorkerJobs extends stream.Readable {
  constructor(sequelize, worker) {
    super({ objectMode: true })

    const { Op } = sequelize

    this.uuid = `${this.constructor.name}-${process.pid}-${uuid()}`
    this.debug = Debug(`arturo:${this.uuid}`)

    this.sequelize = sequelize
    this.where = {
      route: worker.route,
      status: ['scheduled', 'retry'],
      scheduledDate: { [Op.lte]: new Date },
      lock: null,
    }

    Shutdown.addHandler((code, sig) => {
      this.destroy()
      console.log(`${this.constructor.name} shutdown complete...`)
    }, (remover) => this.once('end', remover))
  }

  async _read() {
    if (this.destroyed) return

    const { sequelize } = this
    const { Job } = sequelize.models

    try {
      let instance = null
      await sequelize.transaction(async transaction => {
        instance = await Job.findOne({
          where: this.where,
          lock: transaction.LOCK.UPDATE,
          transaction
        })

        if (instance) {
          await instance.update({
            lastServer: global.server ? global.server.id : -1,
            lock: global.server ? global.server.id : -1,
          }, { transaction })
        }
      })
      this.push(instance ? instance.toJSON() : null)
    } catch (err) {
      console.error(`${this.uuid}: DATABASE ERROR`)
      console.error(err)
    }
  }

  _destroy() {
    this.end()
  }
}