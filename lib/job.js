'use strict';

const EventEmitter = require('events');
const os = require('os');
const debug = require('debug')('chore:job');

async function proxy(worker, job) {
  return worker(job);
}

class Job extends EventEmitter {
  constructor(type, payload) {
    super();

    // state
    this._ttl = null;

    if (arguments.length == 2) {
      this._payload = payload;
      this.instance = Job.Model.build({
        type,
        payload: JSON.stringify(payload)
      });
      debug(`created: ${type}`);
    } else {
      this.instance = type;
      this._payload = JSON.parse(this.instance.payload);
    }
  }

  get(prop) {
    if (prop === 'payload') {
      return this._payload;
    }

    this.instance.get(prop);
  }

  set(prop, value) {
    this.instance.set(prop, value);
  }

  // CRUD
  save() {
    this.instance.host = os.hostname();

    let persisted = this.instance.save();

    persisted.then(() => {
      this._ttl = null;
    });

    return persisted;
  }

  // JOB STATUSES
  completed() {
    if (this._ttl) clearTimeout(this._ttl);

    this.instance.status = 'completed';
    return this.save()
      .then(() => this.emit('completed'))
      .catch(err => console.error(err));
  }

  failed(err, opts = {}) {
    this.instance.attempts++;
    this.instance.status = 'failed';

    if (err) this.instance.message = err.message;

    if (!opts.force) {
      let max_attempts = this.instance.max_attempts;
      if (max_attempts) {
        if (this.instance.attempts < max_attempts)
          this.instance.status = 'schedule';
      }
    }

    return this.save()
      .then(() => this.emit('failed', err))
      .catch(err => console.error(err));
  }

  process(worker) {
    let ttl = this.instance.ttl;

    this.instance.status = 'processing';
    return this.save()
      .then(() => {
        if (ttl) {
          this._ttl = setTimeout(
            () => this.failed(new Error(`Time-to-live exceeded: ${ttl}ms`)),
            ttl
          );
        }
        this.emit('processing');

        return proxy(worker, this);
      })
      .then(() => this.completed())
      .catch(err => this.failed(err));
  }

  static findAll(query) {
    return this.queue.findAll(query).then(jobs => jobs.map(job => new Job(job)));
  }
}

module.exports = function (Model) {
  Job.Model = Model;
  return Job;
};