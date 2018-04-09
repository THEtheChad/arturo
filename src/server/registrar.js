import nssocket from 'nssocket'
import Debug from 'debug'
const debug = Debug('arturo:server:registrar')

export default function Registrar(server, port = 61681) {
  const listener = nssocket.createServer(socket => {
    socket.data(['worker', 'add'], (worker) => {
      debug(`adding worker ${worker.route}`)
      server.addWorker(worker)
      socket.send(['recieved'])
    })

    socket.data(['worker', 'remove'], (worker) => {
      debug(`removing worker ${worker.route}`)
      server.removeWorker(worker)
      socket.send(['recieved'])
    })

    socket.send(['connected'])
  })
    .on('listening', () =>
      debug(`listening on ${listener.address().address}:${listener.address().port}`))
    .on('error', err => {
      const restartDelay = 5000
      console.error(`WARNING: Registrar encountered an error`)
      console.error(`         restarting in ${restartDelay}ms`)
      console.error(err)
      setTimeout(() => Registrar(server, port), restartDelay)
    })
    .listen(port)

  return listener
}