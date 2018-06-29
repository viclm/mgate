exports.serial = function runQueue(queue, iterator, done) {
  let index = -1

  function next(err, data) {
    if (err) {
      done(err, data)
      return
    }
    if (++index < queue.length) {
      iterator(queue[index], index, next, data)
    }
    else {
      done(null, data)
    }
  }

  next()
}

exports.parallel = function runSet(set, iterator, done) {
  let fastDone = false
  let remain = set.length + 1
  let finalData = []

  function next(index, err, data) {
    if (fastDone) {
      return
    }
    if (err) {
      fastDone = true
      done(err)
      return
    }
    if (index > -1) {
      finalData[index] = data
    }
    if (--remain === 0) {
      done(null, finalData)
    }
  }

  for (let i = 0 ; i < set.length ; i++) {
    iterator(set[i], i, next.bind(null, i))
  }

  next(-1)
}
