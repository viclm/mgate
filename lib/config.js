let settings = {
  path: 'api',
  circuitbreaker: true,
}

exports.get = function get(name) {
  return settings[name]
}

exports.set = function set(o) {
  Object.assign(settings, o)
}
