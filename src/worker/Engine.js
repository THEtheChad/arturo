import Actor from '../utilities/Actor'

const proxy = async (worker, job) => worker(job)

export default class Engine extends Actor {
  constructor(_worker, opts) {
    super(async function (job) {
      const worker = proxy(_worker, job)
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
        this.push({ status: 'completed', job })
      } catch (err) {
        this.push({ status: 'failed', job, err: err.message })
      }
    }, opts)
  }
}