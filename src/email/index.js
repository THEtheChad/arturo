import path from 'path'
import nunjucks from 'nunjucks'
import { debounce } from 'lodash'
import nodemailer from 'nodemailer'

const templates = path.join(__dirname, 'templates')
nunjucks.configure(templates, { autoescape: true })

export default class Email {
  constructor(config) {
    if (config) {
      this.transport = nodemailer.createTransport(config)
    }
  }

  send(job) {
    if (!this.transport) return

    const status = { job }
    if (status !== 'completed' || status !== 'failed') return

    const title = job.route
      .replace(/\/(.)/g, (m, c) => ' ' + c.toUpperCase())
      .slice(1)
    const subject = `${title} ${job.status}`
    const bcc = job.watchers.map(watcher => watcher.email)
    const html = nunjucks.render('single.html', job.toJSON())

    this.transport.sendMail({
      from: 'automation@exceleratedigital.com',
      subject,
      bcc,
      html,
    }, (err, info) => err && console.error(err))

    // @TODO: add debounce for emails so we don't mail too frequentyly
    return

    // let message = this.queue.get(messageId)
    // if (!message) {
    //   message = {}
    //   message.queue = debounce((function () {
    //     const html = nunjucks.render('single.html', job.toJSON())
    //   }).bind(message), 350000)
    // }

    // message.job = job.toJSON()
    // message.queue()
  }
}