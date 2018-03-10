import os from 'os'
import Debug from 'debug'
import Promise from 'bluebird'
import child_process from 'child_process'

import universal from './universal'
import database from '../database'

const debug = Debug('chore:client')

const FIVE_MINUTES = 300000
const FIVE_SECONDS = 5000

export default class Client {
  constructor(config) {
    this.db = database(config)
    this.host = os.hostname()

    this.workers = new Map()

    this.initialized = this.db.initialized.then(async () => {
      this.instance = await this.db.models.Client.create(this)
      this.id = this.instance.id

      this.trigger('processScheduledJobs', FIVE_SECONDS)
      this.trigger('keepAlive', FIVE_MINUTES)
    })
  }

  async trigger(method, elapsed) {
    await this[method]()
    setTimeout(() => this.trigger(method, elapsed), elapsed)
  }

  async keepAlive() {
    return this.instance.update({ keepAlive: new Date })
  }

  async processScheduledJobs() {
    const { Op } = this.db
    const route = []
    this.workers.forEach((worker, _route) => route.push(_route))

    const where = {
      route,
      status: ['scheduled', 'retry'],
      scheduledAt: { [Op.lte]: new Date }
    }

    const jobs = await this.db.models.Job.findAll({ where })
    const pool = Math.max(jobs.length, os.cpus().length)

    // process jobs
    let l = jobs.length
    while (l--) {
      const job = jobs[l]
      job.client = this.id
      const worker = this.workers.get(job.route)

      console.log(job.toJSON())

      await job.assign(worker)
    }
  }

  create(route, payload = {}, opts = {}) {
    if (!route) throw new Error('Must specify a route for the job.')

    const defaults = { id: route }
    this.db.models.Route.findCreateFind({ where: defaults, defaults })

    return this.db.models.Job.create({ origin: this.id, route, payload, ttl: opts.ttl })
  }

  async process(route, worker) {
    if (this.workers.has(route))
      throw new Error(`Worker already defined for: ${route}`)

    this.workers.set(route, worker)

    // register route
    const defaults = { id: route }
    const [_route, isNew] = await this.db.models.Route.findCreateFind({ where: defaults, defaults })
    this.instance.addRoute(_route)
  }
}