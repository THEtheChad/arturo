import { promisify } from 'util'

const proxy = async (worker, job) => worker(job)

module.exports = function (worker) {
  const type = typeof worker
  if (type !== 'function')
    throw new Error(`Expected worker to be a function but got ${type} instead.`)

  if (worker.length > 1)
    worker = promisify(worker)

  process.on('message', async (job) => {
    const processing = proxy(worker, job)
    const operations = [processing]

    if (job.ttl) {
      const timeout = new Promise((resolve, reject) => {
        let timer = setTimeout(() => reject(new Error(`Time-to-live exceeded: ${job.ttl}ms`)), job.ttl)
        processing.then(() => {
          clearTimeout(timer)
          resolve()
        })
      })
      operations.push(timeout)
    }

    try {
      await Promise.all(operations)
      process.send({
        status: 'completed',
        payload: job
      })
    }
    catch (err) {
      process.send({
        status: 'failed',
        err: err.message,
        payload: job
      })
    }
    process.disconnect()
  })
}