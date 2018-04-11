import Reader from '../utilities/Reader'

export default class QueryScheduledJobs extends Reader {
  constructor(sequelize, worker) {
    const { Op } = sequelize

    super(sequelize.models.Job, {
      where: {
        route: worker.route,
        status: ['scheduled', 'retry'],
        scheduledDate: { [Op.lte]: new Date },
      }
    })
  }
}