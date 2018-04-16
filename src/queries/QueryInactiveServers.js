import moment from 'moment'
import FindOne from '../utilities/FindOne'

export default class QueryInactiveServers extends FindOne {
  constructor(sequelize, timing) {
    const { Op } = sequelize

    super(sequelize.models.Server, () => ({
      active: true,
      keepAlive: {
        [Op.lt]: moment().subtract(10, 'minutes')
      }
    }), timing)
  }
}