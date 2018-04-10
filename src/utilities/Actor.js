import stream from 'stream'

const identity = v => v

class ActorFlow extends stream.Transform {
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
        this.push(result)
        this.inactive(operation)
      })
      .catch(err => {
        this.emit('error', err)
        this.inactive(operation)
      })

    return operation
  }

  _transform(obj, enc, next) {
    const operation = this.process(obj);

    if (this._active.length < this.concurrency) {
      next()
    } else {
      operation.then(() => next())
    }
  }
}

export default class Actor {
  constructor(computation = identity, opts = {}) {
    this.stream = new ActorFlow(computation, opts)
    this.sources = []
  }

  inbox(stream, opts = { end: false }) {
    this.sources.push(stream)
    stream.pipe(this.stream, opts)
    stream.on('end', () => {
      console.log('unpiping')
      stream.unpipe(this.stream)
      const idx = this.sources.indexOf(stream)
      if (idx !== -1) {
        this.sources.splice(idx, 1)
      }
    })
  }

  outbox(stream) {
    if (stream) {
      this.stream.pipe(stream)
    }
    return this.stream
  }

  exit() {
    this.sources.forEach(stream => {
      stream.unpipe(this.stream)
    })
  }
}