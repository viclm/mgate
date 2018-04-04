exports.wrap = function wrap(fn) {
  return function (context, defaults, callback) {
    let ret
    if (fn) {
      try {
        ret = fn(context)
      }
      catch (err) {
        callback(err)
        return
      }
    }
    else {
      ret = defaults
    }

    if (typeof ret.then === 'function' && ret.then.length === 2) {
      ret.then(r => {
        callback(null, r)
      }, callback)
    }
    else {
      callback(null, ret)
    }
  }
}
