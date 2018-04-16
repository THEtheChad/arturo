import Actor from '../utilities/Actor'

export default class Engine extends Actor {
  constructor(worker, opts) {
    super(opts)

    this.worker = async (job) => worker(job)
  }

  async _compute(job) {
    const worker = this.worker(job)
    const operations = [this.worker]

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
      this.push({ status: 'completed', job })
    }
    catch (err) {
      this.push({ status: 'failed', job, err: err.message })
    }
  }
}