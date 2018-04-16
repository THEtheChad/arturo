import Actor from '../utilities/Actor'

export default class AddWorker extends Actor {
  constructor(sequelize, opts = {}) {
    super(function (_worker) {
      const worker = Object.assign({}, _worker.toJSON())
      worker.ServerId = opts.server ? opts.server.id : -1
      return sequelize.models.Worker.create(worker)
    })
  }
}