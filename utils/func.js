exports.multiple = async function multiple(func, ...args) {
  let ret
  try {
    ret = await func(...args)
  }
  catch (err) {
    return [null, err]
  }

  return [ret, null]
}

exports.promisify = function promisify(func, ...args) {
  let ret
  try {
    ret = func(...args)
  }
  catch (err) {
    return Promise.reject(err)
  }

  return ret instanceof Promise ? ret : Promise.resolve(ret)
}

