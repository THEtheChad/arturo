import Actor from '../utilities/Actor'
import Email from '../email'

export default class Notifier extends Actor {
  constructor(sequelize) {
    const email = new Email()

    super(async (job) => {
      const watchers = await sequelize.models.Watcher.findAll({
        where: {
          route: job.route,
          digest: false,
        }
      })
      email.send(job, watchers.map(watcher => watcher.toJSON()))
    })
  }
}