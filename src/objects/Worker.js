export default class Worker {
  constructor(attrs) {
    if (!attrs.route)
      throw new Error('invalid worker: must specify a route')

    Object.assign(this, {
      route: null,
    }, attrs)
  }
}