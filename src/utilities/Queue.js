import stream from 'stream'

export default class Queue extends stream.Transform {
  constructor(opts) {
    super({ objectMode: true })
  }

  _transform(payload, enc, next) {
    this.push(payload.payload ? payload : { payload })
    next()
  }
}