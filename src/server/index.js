import os from 'os'
import Debug from 'debug'
import moment from 'moment'
import Promise from 'bluebird'
import listener from './listener'
import database from '../database'

// Objects
import Worker from '../objects/Worker'

// Modules
import Registrar from './Registrar'
import ProcessScheduledJobs from './ProcessScheduledJobs'

// Utilities
import Queue from '../utilities/Queue'
import CRUD from '../utilities/CRUD'

const debug = Debug('arturo:server')

export default class Server {
  constructor(config) {
    this.db = database(config)
    this.host = os.hostname()

    this.strategies = [
      {
        name: 'exponential',
        schedule: (job) => {
          job.scheduledDate = job.scheduledDate.getTime() + Math.pow(job.interval, job.attempts)
        }
      }
    ]

    this.initialized = this.db.initialized.then(async () => {
      // register with the database
      this.instance = await this.db.models.Server.create(this)

      this.processor = new ProcessScheduledJobs(this.db, {
        server: this,
        concurrency: Math.max(os.cpus() - 1, 1),
      })

      this.trigger('keepAlive', moment.duration(5, 'minutes'))
      this.trigger('scheduleRetries', moment.duration(1, 'minute'))
      this.trigger('markActiveClients', moment.duration(10, 'minutes'))
      this.trigger('markActiveServers', moment.duration(10, 'minutes'))
      this.trigger('processScheduledJobs', moment.duration(1, 'minute'))
    })
  }

  initRegistrar() {
    const registrar = new Registrar
    const persist = new CRUD(Worker)
    persist.create(registrar.queue.add)
    persist.destroy(registrar.queue.remove)
  }

  get id() { return this.instance.id }
  set id(v) {
    throw new Error('id can only be retrieved from the database')
  }

  async trigger(method, elapsed) {
    await this[method]()
    setTimeout(() => this.trigger(method, elapsed), elapsed)
  }

  async keepAlive() {
    return this.instance.update({ keepAlive: new Date })
  }

  async moniterStaleJobs() {
    const where = { status: 'processing', updatedAt: { [Op.lte]: now - moment.duration(10, 'minutes') } }
    const jobs = await this.db.models.Job.findAll({ where })

    return Promise.map(jobs, job => {
      // @TODO: add handling for stale jobs
    }, { concurrency: 10 })
  }

  async scheduleRetries() {
    const where = { status: 'backoff' }
    const jobs = await this.db.models.Job.findAll({ where })

    return Promise.map(jobs, job => {
      const strategy = this.strategies.find(strategy => strategy.name === job.backoff)
      strategy.schedule(job)

      job.lastServer = this.id
      job.status = 'retry'
      return job.save()
    }, { concurrency: 10 })
  }

  async markActiveClients() {
    const { Op } = this.db
    const now = (new Date).getTime()

    const where = { keepAlive: { [Op.lte]: now - moment.duration(10, 'minutes') } }
    const clients = await this.db.models.Client.findAll({ where })

    // @TODO: reactivate clients that are back online

    return Promise.map(clients, client => client.update({ active: false }), { concurrency: 10 })
  }

  async markActiveServers() {
    const { Op } = this.db
    const now = (new Date).getTime()

    const where = { updatedAt: { [Op.lte]: now - moment.duration(10, 'minutes') } }
    const servers = await this.db.models.Server.findAll({ where })

    // @TODO: reactivate servers that are back online

    return Promise.map(servers, server => server.update({ active: false }), { concurrency: 10 })
  }

  async processScheduledJobs() {
    this.processor.execute()
  }
}