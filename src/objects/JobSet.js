export default class Worker {
  constructor(worker = {}, job = {}) {
    this.worker = worker
    this.job = job
  }

  toJSON() {
    return {
      worker: this.worker.toJSON(),
      job: this.job.toJSON()
    }
  }
}