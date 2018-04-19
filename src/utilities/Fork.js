import os from 'os'
import stream from 'stream'
import { fork } from 'child_process'

export default class Fork extends stream.Writable {
  constructor() {
    super({ objectMode: true })

    this.max = Math.max(os.cpus().length - 1, 1)
    this.active = 0
  }

  async _write({
    path,
    args,
    opts,
    onSpawn,
    onExit,
    onDisconnect,
    onError
  }, enc, next) {
    if (this.destroyed) return

    if (this.active >= this.max) {
      console.log('deferred', path)
      this.once('available', () => {
        console.log('loading', path)
        this._write(args, enc, next)
      })
      return
    }

    this.active++
    const child = fork(path, args || [], opts || {})

    const kill = () => child.kill()
    this.on('destroy', kill)

    child
      .on('error', err => {
        this.emit('child:error', err, child)
        if (onError) onError.call(child, err, child)
      })
      .on('disconnect', () => {
        this.emit('child:disconnect', child)
        if (onDisconnect) onDisconnect.call(child, child)
      })
      .once('exit', (code, sig) => {
        this.emit('child:exit', child, code, sig)
        if (onExit) onExit.call(child, code, sig, child)
        this.removeListener('destroy', kill)
        this.active--
        this.emit('available')
      })

    this.emit('child:spawn', child)
    onSpawn.call(child, child)
    next()
  }

  _destroy(err, done) {
    if (this.active <= 0) done()

    this.on('available', () => {
      if (this.active <= 0) done()
    })

    this.emit('destroy')
  }
}