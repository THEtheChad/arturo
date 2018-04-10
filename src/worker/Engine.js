import stream from 'stream'

const proxy = async (worker, job) => worker(job)

export default class Engine extends stream.Transform {
  constructor(worker, opts = {}) {
    super({ objectMode: true })

    this.worker = worker
    this.concurrency = opts.concurrency || 1
    this.active = []
  }

  async process(job) {
    const worker = proxy(this.worker, job)
    const operations = [worker]

    if (job.ttl) {
      const timeout = new Promise((resolve, reject) => {
        let timer = setTimeout(() => reject(new Error(`Time-to-live exceeded: ${job.ttl}ms`)), job.ttl)
        worker.then(() => {
          clearTimeout(timer)
          resolve()
        })
      })
      operations.push(timeout)
    }

    try {
      await Promise.all(operations)
      this.push({
        status: 'completed',
        job
      })
    } catch (err) {
      this.push({
        err: err.message,
        status: 'failed',
        job
      })
    }
  }

  async _transform(job, enc, next) {
    const operation = this.process(job)

    this.active.push(operation)
    operation.then(() => {
      const idx = this.active.indexOf(operation)
      this.active.splice(idx, 1)
    })

    if (this.active.length < this.concurrency) {
      next()
    } else {
      operation.then(next)
    }
  }
}