'use strict';

const debug = require('debug')('chore:server:scheduler');
const moment = require('moment');

class Scheduler {
  constructor(model, opts = { polling_delay: 2000, max_concurrent_jobs: 200 }) {
    this.model = model;
    this.opts = opts;
    this.Job = require('../job')(model);

    this.algorithms = [];

    this.timer = null;
  }

  next() {
    this.timer = setTimeout(() => this.process(), this.opts.polling_delay);
    return this;
  }

  getJobs() {
    return this.model.findAll({
      where: { status: 'schedule' },
      limit: this.opts.max_concurrent_jobs
    });
  }

  async schedule(instance) {
    let job = this.Job(instance);
    let schedule_type = job.instance.scheduling;

    let algorithm = this.getAlgorithm(schedule_type);

    job.instance.message = 'missing scheduler';

    if (!algorithm) {
      return job.failed(
        new Error(
          `scheduling algorithm has not been registered: \`${schedule_type}\``
        ),
        { force: true }
      );
    }

    job.instance.scheduled = algorithm.exec(job);
    job.instance.status = 'queued';
    return job.save();
  }

  async process(opts = { poll: true }) {
    let jobs = await this.getJobs();
    await Promise.all(jobs.map(job => this.schedule(job)));

    if (opts.poll) this.next();
  }

  register(type, exec) {
    this.algorithms.push({
      type,
      exec
    });

    return this;
  }

  getAlgorithm(schedule_type) {
    return this.algorithms.find(algorithm => algorithm.type == schedule_type);
  }

  exists(schedule_type) {
    return !!this.getAlgorithm(schedule_type);
  }
}

Scheduler.defaults = function(model, opts) {
  let scheduler = new Scheduler(model, opts);

  scheduler.register('five-minutes', function(job) {
    return moment(job.instance.date_updated).add(5, 'minutes');
  });

  scheduler.register('exponential', function(job) {
    let last_run = moment(job.instance.date_updated);
    let delay = last_run.diff(job.instance.date_created) * 2;

    return last_run.add(delay || 100, 'ms');
  });

  return scheduler;
};

module.exports = Scheduler;
