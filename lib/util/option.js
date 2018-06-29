function funcCb(func, callback, ...args) {
  let ret
  try {
    ret = func(...args)
  }
  catch (err) {
    callback(err)
    return
  }
  if (ret && typeof ret.then === 'function' && ret.then.length === 2) {
    ret.then(r => {
      callback(null, r)
    }, callback)
  }
  else {
    callback(null, ret)
  }
}

exports.wrap = function wrap(f) {
  return function (func, noop) {
    if (typeof f === 'function') {
      func(funcCb.bind(null, f))
    }
    else {
      noop()
    }
  }
}
