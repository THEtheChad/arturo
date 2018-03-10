import universal from './universal'
let db

process.on('message', function (message) {
  const ppid = /ppid:(\d+)/.exec(message)
  if (ppid) {
    console.log(universal())
    // db = universal().get(Number(ppid[1]))
    // console.log(Number(ppid[1]), db)
    return
  }
  console.log('[child] received message from server:', message);
  setTimeout(() => process.disconnect(), 5000);
})