import JobUpdater from './JobUpdater'
import WorkerManager from './WorkerManager'
import QueryScheduledWorkers from '../queries/QueryScheduledWorkers'

export default class ProcessScheduledJobs {
	constructor(sequelize, opts = {}) {
		this.sequelize = sequelize

		this.manager = new WorkerManager(sequelize, opts)
		this.results = this.manager.outbox()

		this.updater = new JobUpdater(sequelize, opts)
		this.updater.inbox(this.results)
	}

	execute() {
		this.manager.inbox(new QueryScheduledWorkers(this.sequelize))
	}
}