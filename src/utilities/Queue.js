import stream from 'stream'

export default class Queue extends stream.PassThrough {
  constructor(opts) {
    super(Object.assign({ objectMode: true }, opts))
  }
}