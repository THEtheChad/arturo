import pm2 from 'pm2'

pm2.connect(err => {
  console.log('mounting to pm2 process...')
  if (err) {
    console.error(err)
    process.exit(2)
  }

  pm2.start({
    name: 'jobqueue',
    script: './lib/server/index.js',
  }, (err, apps) => {
    pm2.disconnect()
    if (err) throw err
  })
})