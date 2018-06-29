const settings = {
  path: 'api',
  maxdepends: 2,
  skipnull: true,
  upload: false,
  circuitbreaker: false,
  response(err, data) {
    return {
      error: err ? { message: err.message } : null,
      data: data
    }
  }
}

function get(object, name) {
  return object[name]
}

function set(object, o) {
  Object.assign(object, o)
}

module.exports = new Proxy(settings, {
  get(target, name) {
    if (name === 'get') {
      return get.bind(null, target)
    }
    else if (name === 'set') {
      return set.bind(null, target)
    }
    else {
      return target[name]
    }
  }
})
