import stream from 'stream'
import Debug from 'debug'
const debug = Debug('arturo:query:scheduled-workers')

export default class QueryScheduledWorkers extends stream.Readable {
  constructor(sequelize, trigger) {
    super({ objectMode: true })

    this.sequelize = sequelize
    this.timer = setInterval(() => this.queue(), trigger)

    global.shutdown((code, sig) => {
      this.destroy()
      debug(`${this.constructor.name} shutdown complete!`)
    })
  }

  queue() {
    if (this.readableLength > 0) return

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
              Jobs.scheduledDate <= CONVERT('${new Date().toISOString()}', datetime)
            GROUP BY Jobs.route
        )
    `)
      .spread((workers, metadata) => {
        debug(`found ${workers.length} scheduled workers...`)
        workers.forEach(worker => this.push(worker))
      })
  }

  _read() { }

  _destroy(err, done) {
    this.unpipe()
    clearInterval(this.timer)
    done()
  }
}