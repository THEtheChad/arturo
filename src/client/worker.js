import EventEmitter from 'events'

export default class Worker {
  constructor(route, path, opts = { concurrency: 1 }) {
    this.route = route
    this.path = path
    this.concurrency = opts.concurrency
  }
}