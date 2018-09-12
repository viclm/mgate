const Buckets = {}

exports.init = function init(name, options) {
  const { capacity = Infinity, rate = Infinity } = options
  Buckets[name] = {
    capacity: capacity,
    rate: rate / 1000,
    tokens: 0,
    lastDrip: +new Date()
  }
  return Buckets[name]
}

exports.consume = function consume(name) {
  const bucket = Buckets[name]

  const time = +new Date()
  bucket.tokens = Math.min(bucket.tokens + Math.floor(bucket.rate * (time - bucket.lastDrip)), bucket.capacity)
  bucket.lastDrip = time

  if (bucket.tokens > 0) {
    bucket.tokens--
    return true
  }

  return false
}
