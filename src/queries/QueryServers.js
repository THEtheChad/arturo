import RecordStream from './RecordStream'

export default class QueryServers extends RecordStream {
  constructor(sequelize, where) {
    super(sequelize.models.Server, where)
  }
}