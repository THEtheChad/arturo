const TWO_HOURS = 7200000

export default class Job {
  constructor(attrs) {
    if (!attrs.route)
      throw new Error('invalid job: must specify a route')

    this.data = {
      id: null,
      route: null,
      params: '{}',
      hash: '',
      status: 'scheduled',
      ttl: TWO_HOURS,
    }

    this.indexes = ['id']

    Object.assign(this.data, attrs)
  }

  toJSON() {
    return this.data
  }

  toString() {
    return JSON.stringify(this.toJSON())
  }
}