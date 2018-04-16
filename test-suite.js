const path = require('path')
const server = require('./test-server')
// const worker = require('./test-client')

async function main() {
  await server.initialized

  await server.sequelize.models.Worker.create({ route: '/test1', type: 'local', path: path.join(__dirname, 'test-worker.js'), ServerId: server.id })
  await server.sequelize.models.Watcher.create({ route: '/test1', email: 'chad.d.elliott@gmail.com', digest: false })

  await server.sequelize.models.Job.create({ route: '/test1' })
  await server.sequelize.models.Job.create({ route: '/test1' })
  await server.sequelize.models.Job.create({ route: '/test1' })
  await server.sequelize.models.Job.create({ route: '/test1' })
  await server.sequelize.models.Job.create({ route: '/test1' })
  await server.sequelize.models.Job.create({ route: '/test1' })
  await server.sequelize.models.Job.create({ route: '/test1' })
}
main()
  .catch(err => { throw err })