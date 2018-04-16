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

  const queue = new Queue
  const engine = new Engine(worker, opts)
  engine.inbox(queue, { end: true })

  engine.outbox()
    .on('data', result => messenger.send(result))
    .on('end', () => messenger.disconnect())

  messenger.on('message', (msg) => {
    switch (msg.type) {
      case 'job': queue.push(msg.job); break
      case 'end': queue.push(null); break
    }
  })

  return queue
}