import path from 'path'
import nunjucks from 'nunjucks'
import { debounce } from 'lodash'
import nodemailer from 'nodemailer'

const templates = path.join(__dirname, 'templates')
nunjucks.configure(templates, { autoescape: true })

export default class Email {
  constructor(config) {
    // this.transport = nodemailer.createTransport({
    //   sendmail: true,
    //   newline: 'unix',
    //   path: '/usr/sbin/sendmail',
    // })
    this.queue = new Map()
  }

  send(watcher, job) {
    const messageId = [watcher.email, job.id].join('-')

    let message = this.queue.get(messageId)

    // @TODO: add debounce for emails so we don't mail too frequentyly
    if (!message) {
      message = {}
      message.queue = debounce((function () {
        const html = nunjucks.render('single.html', job.toJSON())
      }).bind(message), 350000)
    }

    message.job = job.toJSON()
    message.queue()

    // this.transport.sendMail({
    //   from: 'automation@exceleratedigital.com',
    //   subject: '',
    //   to: [],
    //   text: 'test',
    //   html: 'test',
    // }, (err, info) => {
    //   if (err) return console.error(err);

    //   console.log('Message sent: %s', info.messageId);
    // });
  }
}