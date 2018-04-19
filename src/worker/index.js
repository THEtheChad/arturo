import { promisify } from 'util'

import Engine from './Engine'
import Queue from '../utilities/Queue'

export default function Factory(worker, opts = {}) {
  const type = typeof worker
  if (type !== 'function')
    throw new Error(`Expected worker to be a function but got ${type} instead.`)

  if (worker.length > 1)
    worker = promisify(worker)

  const messenger = opts.messenger || process
  const queue = new Queue()

  queue
    .pipe(new Engine(worker, opts))
    .on('data', ({ payload: job, errorMsg, errorId }) => {
      if (errorMsg) {
        job.status = 'failed'
        job.errorMsg = errorMsg
        job.errorId = errorId
      }
      messenger.send(job)
    })
    .on('end', () => messenger.kill())

  messenger.on('message', (msg) => {
    switch (msg.type) {
      case 'job': queue.write(msg.job); break
      case 'end': queue.end(); break
    }
  })

  return queue
}