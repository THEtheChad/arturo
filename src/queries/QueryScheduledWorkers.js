import Debug from 'debug'
import stream from 'stream'
import uuid from '../utilities/uuid'
import Shutdown from '../server/Shutdown'

export default class QueryScheduledWorkers extends stream.Readable {
  constructor(sequelize, trigger) {
    super({ objectMode: true })

    this.sequelize = sequelize
    this.uuid = `${this.constructor.name}-${process.pid}-${uuid()}`
    this.debug = Debug(`arturo:${this.uuid}`)

    Shutdown.addHandler((code, sig, done) => this.destroy(null, () => {
      console.log(`${this.uuid} shutdown complete...`)
      done()
    }))
  }

  fetch() {
    if (this.destroyed) return
    if (this.readableLength > 0) return

    const { Op, dialect } = this.sequelize
    const generator = dialect.QueryGenerator
    const now = new Date

    this.sequelize.query(`
      SELECT *
      FROM Workers
      WHERE
        Workers.active = 1 AND
        Workers.route IN (
          SELECT Jobs.route
          FROM Jobs
          WHERE
              Jobs.status IN ('scheduled', 'retry') AND
              ${generator.whereItemQuery(generator._castKey('Jobs.scheduledDate', now), { [Op.lte]: now })}
              Jobs.scheduledDate <= CONVERT('${().toISOString()}', datetime)
            GROUP BY Jobs.route
        )
    `)
      .spread((workers, metadata) => {
        this.debug(`found ${workers.length} worker(s) with scheduled jobs...`)
        workers.forEach(worker => this.push(worker))
      })
  }

  _read() { }

  _destroy(err, done) {
    this.push(null)
    this.unpipe()
    done()
  }
}