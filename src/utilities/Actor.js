import stream from 'stream'
import EventEmitter from 'events'

const identity = v => v

class ActorFlow extends stream.Writable {
  constructor(computation, opts) {
    super({ objectMode: true })

    this._active = []
    this.computation = async (obj) => computation(obj)
    this.concurrency = opts.concurrency || 1
  }

  active(operation) {
    this._active.push(operation)
  }

  inactive(operation) {
    const idx = this._active.indexOf(operation)
    this._active.splice(idx, 1)
  }

  process(obj) {
    const operation = this.computation(obj)
    this.active(operation)
    operation
      .then((result) => {
        this.inactive(operation)
      })
      .catch(err => {
        this.emit('error', err)
        this.inactive(operation)
      })

    return operation
  }

  _write(obj, enc, next) {
    const operation = this.process(obj);

    if (this._active.length < this.concurrency) {
      next()
    } else {
      operation.then(() => next())
    }
  }
}

export default class Actor extends EventEmitter {
  constructor(computation = identity, opts = {}) {
    super()
    this.sources = []
    this._outbox = new stream.PassThrough({ objectMode: true })
    this._inbox = new ActorFlow(computation.bind(this._outbox), opts)

    this._inbox.on('finish', () => this.exit())
  }

  inbox(stream, _opts) {
    const opts = Object.assign({ end: false }, _opts)

    // this.sources.push(stream)
    stream.pipe(this._inbox, opts)
    // stream.on('unpipe', () => {})
    // stream.on('end', () => {
    //   this.emit('source:end', stream)
    //   stream.unpipe(this._inbox)
    //   const idx = this.sources.indexOf(stream)
    //   if (idx !== -1) {
    //     this.sources.splice(idx, 1)
    //   }
    // })
  }

  outbox(stream) {
    if (stream) {
      this._outbox.pipe(stream)
    }
    return this._outbox
  }

  exit() {
    this.sources.forEach(stream =>
      stream.unpipe(this.stream))
    this._inbox.end()
    this._outbox.end()
    this.emit('end')
  }
}