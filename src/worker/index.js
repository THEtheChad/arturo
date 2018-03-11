import { promisify } from 'util'

module.exports = function (_worker) {
  const type = typeof _worker
  if (type !== 'function')
    throw new Error(`Expected worker to be a function but got ${type} instead.`)

  // turn the worker into a promise
  const worker = (_worker.length === 1) ? Promise.resolve(_worker) : promisify(_worker)

  process.on('message', async (job) => {
    const processing = worker(job).catch(err => { })
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