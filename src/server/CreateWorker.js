import Debug from 'debug'
import Actor from '../utilities/Actor'
import Shutdown from '../server/Shutdown'

export default class CreateWorker extends Actor {
  constructor(sequelize, opts = {}) {
    super(opts)

    this.sequelize = sequelize

    Shutdown.addHandler((code, sig, done) => this.once('finish', () => {
      console.log(`${this.uuid} shutdown complete...`)
      done()
    }))
  }

  async _compute(worker) {
    worker.serverId = global.server ? global.server.id : -1

    try {
      const instance = await this.sequelize.models.Worker.create(worker)
      this.debug(`WORKER added #${instance.id}`)
    } catch (err) {
      console.error(`${this.uuid}: DATABASE ERROR`)
      console.error(err)
    }
  }
}