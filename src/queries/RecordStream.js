import Debug from 'debug'
import stream from 'stream'
const debug = Debug('arturo:query:records')

export default class RecordStream extends stream.Readable {
  constructor(model, where = {}, opts = { end: false }) {
    super({ objectMode: true })

    this.opts = opts
    this.model = model
    this.where = where
    this.sequelize = this.model.sequelize
  }

  async queue() {
    if (this.readableLength > 0) return

    this.count = await this.model.count({ where: this.where })

    debug(`found ${this.count} ${this.model.name} ${JSON.stringify(this.where)}(s)...`)

    if (this.count) this._read()
  }

  async _read() {
    if (this.active) return
    this.active = true

    let full = false
    while (this.count--) {
      try {
        await this.sequelize.transaction({
          isolationLevel: this.sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
        }, async transaction => {
          const record = this.model.findOne({
            where: this.where,
            lock: transaction.LOCK.UPDATE,
            transaction
          })

          if (record) {
            full = !this.push({ record, transaction })
          }

          return record
        })
      } catch (err) {
        console.error('DATABASE ERROR')
        console.error(err)
      }

      if (full) break
    }

    this.active = false
  }
}