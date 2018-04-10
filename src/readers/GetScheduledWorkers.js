import stream from 'stream'

export default class GetScheduledWorkers extends stream.Readable {
  constructor(sequelize) {
    super({ objectMode: true })

    sequelize.query(`
      SELECT *
      FROM Workers
      WHERE
        Workers.route IN (
          SELECT Jobs.route
          FROM Jobs
          WHERE
              Jobs.status IN ('scheduled', 'retry') AND
              Jobs.scheduled <= CONVERT('${new Date().toISOString()}', datetime)
            GROUP BY Jobs.route
        )
    `)
      .spread((results, metadata) => {
        results.forEach(instance => this.push(instance))
        this.push(null)
      })
  }

  _read() { }
}