import fs from 'fs'
import os from 'os'
import path from 'path'
import Debug from 'debug'
import moment from 'moment'
import Promise from 'bluebird'
import database from '../database'

// Objects
import Worker from '../objects/Worker'

// Modules
import ProcessScheduledJobs from './ProcessScheduledJobs'
import WorkerManager from './WorkerManager'
import Registrar from '../worker/Registrar'
import AddWorker from './AddWorker'
import Notifier from './Notifier'
import ScheduleRetries from './ScheduleRetries'
import JobUpdater from './JobUpdater'

// Queries
import QueryJobs from '../queries/QueryJobs'
import QueryServers from '../queries/QueryServers'
import QueryScheduledWorkers from '../queries/QueryScheduledWorkers'
import QueryInactiveServers from '../queries/QueryInactiveServers'
import QueryActiveServers from '../queries/QueryActiveServers'

// Utilities
import Reader from '../utilities/Reader'
import Actor from '../utilities/Actor'
import Queue from '../utilities/Queue'
import CRUD from '../utilities/CRUD'
import FindOne from '../utilities/FindOne'
import Update from '../utilities/Update'
import QueryBackoffJobs from '../queries/QueryBackoffJobs';

const debug = Debug('arturo:server')

process.on('unhandledRejection', err => console.error(err))

const actions = []
global.shutdown = function (action) { actions.push(action) }
process.on('SIGINT', async (sig, code) => {
  await Promise.map(actions, action => action(code, sig), { concurrency: 10 })
  debug(`Server shutdown complete!`)
  process.exit()
})

export default class Server {
  constructor(config) {
    this.sequelize = database(config)
    this.host = os.hostname()
    this.pid = process.pid

    const { Op } = this.sequelize
    this.initialized = this.sequelize.initialized.then(async () => {
      // register with the database
      global.server = this.instance = await this.sequelize.models.Server.create(this)

      // this.initRegistrar()
      // this.initJobScheduler(moment.duration(10, 'seconds'))
      // this.initServerMonitor(moment.duration(10, 'seconds'))
      this.initJobRunner(moment.duration(10, 'seconds'))
      // this.trigger(this.initScheduler(), 'queue', { status: 'backoff' }, moment.duration(10, 'seconds'))
      // this.trigger(this.initJobRunner(), 'queue', moment.duration(10, 'seconds'))
      // this.initKeepAlive(moment.duration(5, 'minutes'))
    })
  }

  initJobRunner(trigger) {
    const queue = new QueryScheduledWorkers(this.sequelize, trigger)
    const manager = new WorkerManager(this.sequelize, { concurrency: Math.max(os.cpus().length - 1, 1) })
    const updater = new JobUpdater(this.sequelize, { concurrency: 10 })

    manager.inbox(queue)
    updater.inbox(manager.outbox(), { end: true })
    updater.outbox().resume()
  }

  initJobScheduler(trigger) {
    const backoffJobs = new QueryBackoffJobs(this.sequelize, trigger)
    const scheduleRetries = new ScheduleRetries({ server: this })

    backoffJobs.pipe(scheduleRetries)
  }

  initServerMonitor(trigger) {
    setInterval(() => this.markActiveServers(), trigger)
    setInterval(() => this.markInactiveServers(), trigger)
  }

  async markActiveServers() {
    const { Op, models: { Server } } = this.sequelize

    const [count] = await Server.update({ active: true }, {
      where: {
        active: false,
        keepAlive: {
          [Op.gt]: moment().subtract(10, 'minutes')
        }
      }
    })
    debug(`found ${count} newly active servers...`)
  }

  async markInactiveServers() {
    const { Op, models: { Server } } = this.sequelize

    const [count] = await Server.update({ active: false }, {
      where: {
        active: true,
        keepAlive: {
          [Op.lt]: moment().subtract(10, 'minutes')
        }
      }
    })

    debug(`found ${count} newly inactive servers...`)
  }

  initRegistrar() {
    const addWorker = new AddWorker(this.sequelize, { server: this })
    const registrar = new Registrar

    addWorker.inbox(registrar.queue.add)

    const persist = new CRUD(this.sequelize.models.Worker)
    persist.destroy(registrar.queue.remove)
  }

  get id() {
    return this.instance ? this.instance.id : null
  }
  set id(v) {
    throw new Error('id can only be retrieved from the database')
  }

  async trigger(method, timing) {
    await this[method]()
    setTimeout(() => this.trigger(method, timing), timing)
  }

  initKeepAlive(trigger) {
    // setInterval(async () => {
    //   try {
    //     this.instance.update({ keepAlive: new Date })
    //   } catch (err) {
    //     console.error('DATABASE ERROR')
    //     console.error(err)
    //   }
    // }, trigger)
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

    return Promise.map(jobs, job => {
      // @TODO: add handling for stale jobs
    }, { concurrency: 10 })
  }
}