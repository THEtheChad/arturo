import os from 'os'
import Debug from 'debug'
import stream from 'stream'
import uuid from './uuid'

export default class Actor extends stream.Duplex {
  constructor(opts = {}) {
    super({ objectMode: true })

    this.uuid = `${this.constructor.name}-${process.pid}-${uuid()}`

    this.opts = opts
    this.active = 0
    this.concurrency = opts.concurrency || 1

    const push = this.push
    this.push = function (payload) {
      if (payload === null) {
        return push.call(this, null)
      } else {
        return push.call(this, payload.payload ? payload : { payload })
      }
    }

    this.on('finish', () => this.push(null))

    this.debug = Debug(`arturo:${this.uuid}`)
  }

  logError(err) {
    const errId = `${this.uuid}:ERR${uuid()}`
    console.error(errId)
    console.error(err)
    return errId
  }

  async _write({ payload }, enc, next) {
    this.active++
    let concurrent = this.active < this.concurrency

    if (concurrent) next()

    try {
      await Promise.resolve(this._compute(payload))
    } catch (err) {
      const errorId = this.logError(err)
      this.push({ payload, errorMsg: err.message, errorId })
    }

    this.active--
    if (!concurrent) next()
  }

  _read() { }

  _compute(payload) {
    throw new Error('Must provide a _compute method to Actor')
  }

  get empty() {
    return this.writableLength === 0
  }
}