import FindOne from '../utilities/FindOne'

export default class QueryBackoffJobs extends FindOne {
  constructor(sequelize, timing) {
    super(sequelize.models.Job, { status: 'backoff' }, timing)
  }
}