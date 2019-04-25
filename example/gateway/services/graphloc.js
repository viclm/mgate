module.exports = {
  address: 'http://api.graphloc.com/',
  protocol: 'http',
  circuitbreaker: {
    monitor: 10,
    recover: 5,
    threshold: 0.5
  }
}
