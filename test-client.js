const path = require('path')
const Arturo = require('./lib')

const client = new Arturo.Client()

module.exports = function () {
  client.add({ route: '/test1', path: path.join(__dirname, 'test-worker.js') })
}