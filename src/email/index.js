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
    if (!job.watchers.length) return

    switch (job.status) {
      case 'completed':
      case 'failed':
        break
      default:
        return
    }

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
  }
}