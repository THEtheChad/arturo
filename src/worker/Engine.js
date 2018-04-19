import Actor from '../utilities/Actor'

export default class Worker extends Actor {
  constructor(worker, opts) {
    super(opts)

    this.worker = worker
  }

  async _compute(job) {
    const worker = this.worker(job)
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

    await Promise.all(operations)
    job.status = 'completed'
    this.push(job)
  }
}