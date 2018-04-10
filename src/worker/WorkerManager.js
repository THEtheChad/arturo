import os from 'os'
import Actor from '../utilities/Actor'
import stream from 'stream'
import EventEmitter from 'events'
import { fork } from 'child_process'
import Debug from 'debug'
import { resolve } from 'url';
const debug = Debug('arturo:worker:worker-manager')

export default class WorkerManager extends Actor {
  constructor() {
    const active = []
    let exiting = false

    super((worker) => new Promise((resolve, reject) => {
      debug(`${worker.route}: initializing`)
      const child = fork(worker.path)

      active.push(child)
      child.on('disconnect', () => {
        debug(`${worker.route}: disconnected`)
        const idx = active.indexOf(child)
        active.splice(idx, 1)
        if (!exiting) resolve(child)
      })
    })

    this.on('close', () => {
        exiting = true
        debug('disconnecting all workers')
        active.forEach(child => child.disconnect())
        debug('shutting down')
      })
  }
}

// export default class WorkerManager extends stream.Transform {
//   constructor(opts = {}) {
//     super({ objectMode: true })

//     this.active = []
//     this.concurrency = opts.concurrency || 1
//     this._results = new EventEmitter()
//     this.resume()
//     this.on('close', () => {
//       this.exiting = true
//       debug('disconnecting all workers')
//       this.active.forEach(child => child.disconnect())
//       debug('shutting down')
//     })
//   }

//   inbox(stream) {
//     stream.pipe(this, { end: false })
//   }

//   results() {
//     const out = new stream.PassThrough({ objectMode: true })
//     const listener = result => out.write(result)
//     this._results.on('data', listener)
//     out.on('end', () => this._results.removeListener('data', listener))
//     return out
//   }

//   _transform(worker, enc, next) {
//     debug(`${worker.route}: initializing`)
//     const child = fork(worker.path)
//     child.route = worker.route

//     this.active.push(child)
//     child.on('disconnect', () => {
//       debug(`${worker.route}: disconnected`)
//       const idx = this.active.indexOf(child)
//       this.active.splice(idx, 1)
//       !this.exiting && next()
//     })
//     child.on('message', result => {
//       debug(`${worker.route}: message`)
//       this._results.emit('data', result)
//     })

//     this.push(child)

//     if (this.active.length < this.concurrency) next()
//   }
// }