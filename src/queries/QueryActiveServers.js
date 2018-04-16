import moment from 'moment'
import FindOne from '../utilities/FindOne'

export default class QueryInactiveServers extends FindOne {
  constructor(sequelize, timing) {
    const { Op } = sequelize

    super(sequelize.models.Server, () => ({
      active: false,
      keepAlive: {
        [Op.gt]: moment().subtract(10, 'minutes')
      }
    }), timing)
  }
}