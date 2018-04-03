exports.serial = function runQueue(queue, iterator, done) {
  let index = -1
  const next = err => {
    if (err) {
      done(err)
      return
    }
    index++
    if (index < queue.length) {
      iterator(queue[index], index, next)
    }
    else {
      done()
    }
  }
  next()
}

exports.parallel = function runSet(set, iterator, done) {
  let fastDone = false
  let remain = set.length + 1
  const next = err => {
    if (fastDone) {
      return
    }
    if (err) {
      fastDone = true
      done(err)
      return
    }
    remain--
    if (remain === 0) {
      done()
    }
  }
  for (let i = 0 ; i < set.length ; i++) {
    iterator(set[i], i, next)
  }
  next()
}
