import os from 'os'
import path from 'path'
import child_process from 'child_process'
import universal from './universal'

export default class WorkerPool {
  constructor(database) {
    console.log('parent', process.pid)
    universal()[process.pid] = { test: true } // shared db connection

    this._pool = []
    this._queue = []
    this._jobCount = 0

    const cleanup = () => this._pool.forEach(worker => worker.kill())
    process.on('SIGINT', cleanup); // catch ctrl-c
    process.on('SIGTERM', cleanup); // catch kill
    process.on('exit', cleanup)
  }

  queue(_jobs) {
    const jobs = Array.isArray(_jobs) ? _jobs : [_jobs]

    const result = new Promise((resolve, reject) =>
      this._queue.push({ jobs, resolve, reject }))

    this._jobCount += jobs.length

    this.init()
    return result
  }

  init() {
    //   function next(worker) {
    //     if (queue.length) {
    //       const job = queue.pop()
    //       worker.send(job.toJSON())
    //     }
    //   }
    const needed = Math.min(this._jobCount, os.cpus().length);
    const missing = (needed - this._pool.length);

    for (let i = 0; i < missing; i++) {
      const worker = child_process.fork(path.join(__dirname, 'worker'))
      worker.send(`ppid:${process.pid}`)
      // worker.on('message', () => next(worker))
      // next(worker)
      this._pool.push(worker)
    }
  }
}
