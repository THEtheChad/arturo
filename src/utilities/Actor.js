import stream from 'stream'

export default class Actor extends stream.Transform {
  constructor(opts = {}) {
    super({ objectMode: true })

    this.opts = opts

    this.active = []
    this.concurrency = opts.concurrency || 1
    this.compute = async (payload) => this._compute(payload)
    this._outbox = new stream.PassThrough({ objectMode: true })
    this.pipe(this._outbox)

    this.on('pause', () => console.log(`paused ${this.constructor.name}`))
  }

  _compute(payload) {
    throw new Error('Must provide a _compute method to Actor')
  }

  begin(operation) {
    this.active.push(operation)
    operation
      .then(() => this.resolve(operation))
      .catch(err => {
        this.resolve(operation)
        return err
      })
  }

  resolve(operation) {
    const idx = this.active.indexOf(operation)
    this.active.splice(idx, 1)
  }

  get empty() {
    return this.readableLength === 0
  }

  inbox(stream, opts = { end: false }) {
    if (stream) {
      stream.pipe(this, opts)
      return this
    }
    const input = new stream.PassThrough({ objectMode: true })
    input.pipe(this, { end: false })
    return input
  }

  outbox(stream, opts = { end: false }) {
    if (stream) {
      this._outbox.pipe(stream, opts)
      return this
    }
    return this._outbox
  }

  async _transform(payload, enc, next) {
    if (this.flushing) return

    const operation = this.compute(payload)

    this.begin(operation)
    let concurrent = this.active.length < this.concurrency

    if (concurrent) next()

    try {
      await operation
    } catch (err) {
      this.emit('error', err)
    }
    this.resolve(operation)

    if (!concurrent) next()
  }
}