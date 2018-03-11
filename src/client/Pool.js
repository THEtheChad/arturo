import os from 'os'
import EventEmitter from 'events'
import child_process from 'child_process'
import PriorityQueue from 'fastpriorityqueue'

class Pool extends EventEmitter {
  static processes = []
  static queue = new PriorityQueue(child => child.priority)

  constructor() {
    super()
  }

  available() {
    return Math.max(0, os.cpus().length - Pool.processes.length)
  }

  update() {
    const available = this.available()
    const queue = Pool.queue

    while (available && queue.size) {
      const child = queue.poll()
      const instance = child_process.fork(child.path)
      const idx = Pool.processes.push(instance) - 1
      instance.on('exit', () => {
        Pool.processes.splice(idx, 1)
        this.update()
      })

      // @TODO: handle spawn error (reject)
      child.resolve(instance)
    }
  }

  mount(path, priority = 0) {
    const queue = Pool.queue
    const promise = new Promise((resolve, reject) => queue.add({
      path,
      priority,
      resolve,
      reject
    }))
    this.update()
    return promise
  }
}