export default class Email {
  constructor(config) {
    // this.transport = nodemailer.createTransport({
    //   sendmail: true,
    //   newline: 'unix',
    //   path: '/usr/sbin/sendmail',
    // })
  }

  send(email, job) {
    console.log('email', email, job.id)
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