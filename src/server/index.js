import os from 'os'
import Debug from 'debug'
import moment from 'moment'
import database from '../database'

// Modules
import WorkerManager from './WorkerManager'
import Registrar from '../worker/Registrar'
import CreateWorker from './CreateWorker'
import DestroyWorker from './DestroyWorker'
import Notifier from './Notifier'
import ScheduleRetries from './ScheduleRetries'
import Shutdown from './Shutdown'

// Queries
import QueryScheduledWorkers from '../queries/QueryScheduledWorkers'
import QueryBackoffJobs from '../queries/QueryBackoffJobs'

// Utilities
import Queue from '../utilities/Queue'
import CRUD from '../utilities/CRUD'
import uuid from '../utilities/uuid'

// process.on('unhandledRejection', err => console.error('unhandled', err))

export default class Server {
  constructor(config) {
    this.sequelize = database(config)

    this.uuid = `${this.constructor.name}-${process.pid}-${uuid()}`
    this.debug = Debug(`arturo:${this.uuid}`)

    const { Op } = this.sequelize
    this.initialized = this.sequelize.initialized.then(async () => {
      // register with the database
      global.server = this.instance = await this.sequelize.models.Server.create({
        host: os.hostname(),
        pid: process.pid,
        keepAlive: new Date,
        port: 61681,
      })

      this.initRegistrar()
      this.initJobRunner()
      this.initJobScheduler()

      this.trigger('scheduleJobs', moment.duration(10, 'seconds'))
      this.trigger('jobRunner', moment.duration(10, 'seconds'))
      this.trigger('markActiveServers', moment.duration(5, 'minutes'))
      this.trigger('markInactiveServers', moment.duration(5, 'minutes'))
      this.trigger('keepAlive', moment.duration(5, 'minutes'))
    })

    this.enabled = true
    Shutdown.addHandler(() => this.enabled = false)
  }

  async trigger(method, timing) {
    if (!this.enabled) return
    await this[method]()
    setTimeout(() => this.trigger(method, timing), timing)
  }

  initJobRunner() {
    const notifier = new Notifier(this.sequelize)
    this.scheduledWorkers = new QueryScheduledWorkers(this.sequelize)

    this.scheduledWorkers
      .pipe(new Queue)
      .pipe(new WorkerManager(this.sequelize, notifier, { concurrency: Math.max(os.cpus().length - 1, 1) }))
  }

  initJobScheduler(trigger) {
    this.backoffJobs = new QueryBackoffJobs(this.sequelize)

    this.backoffJobs
      .pipe(new Queue)
      .pipe(new ScheduleRetries(this.sequelize))
  }

  async scheduleJobs() {
    this.backoffJobs.fetch()
  }

  async jobRunner() {
    this.scheduledWorkers.fetch()
  }

  async markActiveServers() {
    const { Op, models } = this.sequelize
    const { Server } = models

    try {
      await this.sequelize.transaction(async transaction => {
        const [count] = await Server.update({ active: true }, {
          where: {
            active: false,
            keepAlive: {
              [Op.gt]: moment().subtract(10, 'minutes')
            }
          },
          lock: transaction.LOCK.UPDATE,
          transaction,
        })

        this.debug(`found ${count} newly active server(s)...`)
      })
    } catch (err) {
      console.error(`DATABASE ERROR: server#markActiveServers`)
      console.error(err)
    }
  }

  async markInactiveServers() {
    const { Op, models } = this.sequelize
    const { Server } = models

    try {
      await this.sequelize.transaction(async transaction => {
        const [count] = await Server.update({ active: false }, {
          where: {
            active: true,
            keepAlive: {
              [Op.lt]: moment().subtract(10, 'minutes')
            }
          },
          lock: transaction.LOCK.UPDATE,
          transaction,
        })

        this.debug(`found ${count} newly inactive server(s)...`)
      })
    } catch (err) {
      console.error(`DATABASE ERROR: server#markInactiveServers`)
      console.error(err)
    }
  }

  initRegistrar() {
    const registrar = new Registrar(this.port)

    registrar.queue.add
      .pipe(new CreateWorker(this.sequelize))

    registrar.queue.remove
      .pipe(new DestroyWorker(this.sequelize))
  }

  async keepAlive() {
    try {
      await this.instance.update({ keepAlive: new Date })
    } catch (err) {
      console.error(`DATABASE ERROR: server#keepAlive`)
      console.error(err)
    }
  }

  async moniterStaleJobs() {
    // new Reader(this.sequelize.models.Job, {
    //   where: {
    //     status: 'processing',
    //     updatedAt: { [Op.lte]: now - moment.duration(10, 'minutes') }
    //   }
    // })
    // const where = 
    // const jobs = await this.sequelize.models.Job.findAll({ where })

    // return Promise.map(jobs, job => {
    //   // @TODO: add handling for stale jobs
    // }, { concurrency: 10 })
  }
}