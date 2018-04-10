import stream from 'stream'

export default class JobRunner extends stream.Writable {
  constructor(worker) {
    super({ objectMode: true })
    this.worker = worker
  }

  _write(job, enc, next) {
    this.worker.send({ type: 'job', job })
    next()
  }
}