export default class Job {
  constructor(attrs = {}) {
    if (!attrs.route)
      throw new Error('invalid job: must specify a route')

    Object.assign(this, {
      id: null,
      route: null,
      params: null,
      hash: null,
      status: 'scheduled',
    }, attrs)
  }
}