import os from 'os'
import Debug from 'debug'
import Promise from 'bluebird'

import Worker from './Worker'
import Email from '../email'
import database from '../database'

const debug = Debug('chore:client')

const FIVE_MINUTES = 300000
const FIVE_SECONDS = 5000

export default class Client {
  constructor(config) {
    this.host = os.hostname()
    this.max = os.cpus().length

    this.db = database(config)
    this.email = new Email()

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
    const { Op, Sequelize } = this.db
    const { Job, Watcher } = this.db.models

    const route = []
    this.workers.forEach((worker, _route) => route.push(_route))

    // @TODO: reduce # fields returned by query
    const jobs = await Job.findAll({
      where: {
        route,
        status: ['scheduled', 'retry'],
        scheduled: { [Op.lte]: new Date },
      },
      include: [{
        model: Watcher,
        required: false,
        where: { digest: false },
        as: 'watchers',
      }],
    })

    // @TODO: allow worker concurrency
    await Promise.map(jobs, async job => {
      const worker = this.workers.get(job.route)
      job.lastClient = this.id
      await job.assign(worker)
      await Promise.map(job.watchers, watcher =>
        this.email.send(watcher, job), { concurrency: 10 })
    }, { concurrency: this.max })
  }

  create(route, payload = {}, opts = {}) {
    if (!route) throw new Error('Must specify a route for the job.')

    const defaults = { id: route }
    this.db.models.Route.findCreateFind({ where: defaults, defaults })

    return this.db.models.Job.create({ originClient: this.id, route, payload, ttl: opts.ttl })
  }

  async process(route, pathToWorker, opts = { concurrency: 1 }) {
    if (this.workers.has(route))
      throw new Error(`Worker already defined for: ${route}`)

    this.workers.set(route, new Worker(route, pathToWorker, opts))

    // register route
    const defaults = { id: route }
    const [_route, isNew] = await this.db.models.Route.findCreateFind({ where: defaults, defaults })
    this.instance.addRoute(_route)
  }
}