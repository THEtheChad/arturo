import nssocket from 'nssocket'
import Debug from 'debug'
import Queue from '../utilities/Queue'
import Worker from '../objects/Worker'
const debug = Debug('arturo:server:registrar')

export default class Registrar {
  constructor(port = 61681) {
    this.queue = {
      add: new Queue,
      remove: new Queue
    }

    this.listener = nssocket.createServer(socket => {
      function method(event, queue) {
        socket.data(event.split('.'), (worker) => {
          debug(`${event} ${worker.route}`)
          queue.push(new Worker(worker))
          socket.send(['recieved'])
        })
      }

      method('worker.add', this.queue.add)
      method('worker.remove', this.queue.remove)

      socket.send(['connected'])
    })
      .on('listening', () =>
        debug(`listening on ${this.listener.address().address}:${this.listener.address().port}`))
      .on('error', err => {
        const restartDelay = 5000
        console.error(`WARNING: Registrar encountered an error`)
        console.error(`         restarting in ${restartDelay}ms`)
        console.error(err)
        setTimeout(() => Registrar(server, port), restartDelay)
      })
      .listen(port)
  }

  close(done) { this.listener.close(done) }
}