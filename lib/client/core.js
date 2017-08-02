const EventEmitter = require('events');
const Job = require('../models/job');
const debug = require('debug')('chore:client');

class Chore extends EventEmitter {
  constructor(opts) {
    super();

    this.opts = Object.assign({
      max_concurrent_jobs: 100,
      polling_delay: 2000
    }, opts);

    debug(`initiated! concurrency:${this.opts.max_concurrent_jobs}, polling:${polling_delay}ms`);

    this.workers = [];
  }

  process(type, exec, opts = { concurrent: 10 }) {
    // make sure we don't already have a worker for this type
    let match = this.workers.find(worker => worker.type == type);
    if (match) throw new Error(`Worker already exits for ${type}`);

    this.workers.push({
      type,
      exec,
      opts
    });

    debug(`worker added: ${type}`);
    return this;
  }

  create(type, payload, opts) {
    return new Job(type, payload, opts);
  }

  _schedule() {
    setTimeout(() => this._process(), this.opts.polling_delay);
  }

  _process() {
    debug(`processing queue (${this.workers.length})...`);

    // TODO: only search for job types in this worker queue
    // could get stuck waiting for 100 jobs to be processed by some other client
    Job
      .findAll({
        where: { status: 'queue' },
        limit: this.opts.max_concurrent_jobs
      })
      .then(jobs => {
        let processed = jobs.map(job => {
          let type = job.get('type');

          let worker = this.workers.find(worker => worker.type == type);
          if (!worker) {
            debug(`worker not found for ${type}`);
            return Promise.resolve();
          }

          this.emit('job.processing', job);
          job.once('failed', (job, err) => this.emit('job.failed', job, err));
          job.once('completed', job => this.emit('job.completed', job));

          try {
            return job.process(worker.exec);
          } catch (e) {
            return job.failed(e);
          }
        });

        return Promise.all(processed);
      })
      .then(() => this._schedule())
      .catch(() => this._schedule());
  }
}

module.exports = Chore;
