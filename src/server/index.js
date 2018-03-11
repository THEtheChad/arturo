import os from 'os'
import Debug from 'debug'
import Promise from 'bluebird'
import database from '../database'

const debug = Debug('chore:server')

const TEN_MINUTES = 600000
const FIVE_SECONDS = 5000
const FIVE_MINUTES = 300000

export default class Server {
  constructor(config) {
    this.db = database(config)
    this.host = os.hostname()

    this.strategies = [
      {
        name: 'exponential',
        schedule: (job) => {
          job.scheduled = job.scheduled.getTime() + Math.pow(job.interval, job.attempts)
        }
      }
    ]

    this.initialized = this.db.initialized.then(async () => {
      // register with the database
      this.instance = await this.db.models.Server.create(this)
      this.id = this.instance.id

      this.trigger('keepAlive', FIVE_MINUTES)
      this.trigger('scheduleRetries', FIVE_SECONDS)
      this.trigger('markActiveClients', TEN_MINUTES)
      this.trigger('markActiveServers', TEN_MINUTES)
    })
  }

  async trigger(method, elapsed) {
    await this[method]()
    setTimeout(() => this.trigger(method, elapsed), elapsed)
  }

  async keepAlive() {
    return this.instance.update({ keepAlive: new Date })
  }

  async moniterStaleJobs() {
    const where = { status: 'processing', updatedAt: { [Op.lte]: now - TEN_MINUTES } }
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

    const where = { keepAlive: { [Op.lte]: now - TEN_MINUTES } }
    const clients = await this.db.models.Client.findAll({ where })

    // @TODO: reactivate clients that are back online

    return Promise.map(clients, client => client.update({ active: false }), { concurrency: 10 })
  }

  async markActiveServers() {
    const { Op } = this.db
    const now = (new Date).getTime()

    const where = { updatedAt: { [Op.lte]: now - TEN_MINUTES } }
    const servers = await this.db.models.Server.findAll({ where })

    // @TODO: reactivate servers that are back online

    return Promise.map(servers, server => server.update({ active: false }), { concurrency: 10 })
  }
}