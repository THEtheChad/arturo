import Reader from '../utilities/Reader'

export default class GetScheduledJobs extends Reader {
  constructor(sequelize, worker) {
    const { Op } = sequelize

    super(sequelize.models.Job, {
      where: {
        route: worker.route,
        status: ['scheduled', 'retry'],
        scheduled: { [Op.lte]: new Date },
      }
    })
  }
}