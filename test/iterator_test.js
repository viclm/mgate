const test = require('ava')
const sinon = require('sinon')
const iterator = require('../lib/utils/iterator')

test('run tasks serial', t => {
  const queue = [1, 2, 3, 4, 5]
  const iter = sinon.spy()
  const done = sinon.spy()

  iterator.serial(queue, (item, index, next) => {
    iter()
    next()
  }, done)

  t.is(iter.callCount, 5)
  t.true(done.calledOnce)
})

test('run tasks parallel', t => {
  const queue = [1, 2, 3, 4, 5]
  const iter = sinon.spy()
  const done = sinon.spy()

  iterator.parallel(queue, (item, index, next) => {
    iter()
    next()
  }, done)

  t.is(iter.callCount, 5)
  t.true(done.calledOnce)
})

test('stop the iterator immediately when someone broken', t => {
  const queue = [1, 2, 3, 4, 5]
  const iterS = sinon.spy()
  const doneS = sinon.spy()
  const iterP = sinon.spy()
  const doneP = sinon.spy()

  iterator.serial(queue, (item, index, next) => {
    iterS()
    next('error')
  }, doneS)

  t.is(iterS.callCount, 1)
  t.true(doneS.calledOnceWith('error'))

  iterator.parallel(queue, (item, index, next) => {
    iterP()
    next('error')
  }, doneP)

  t.is(iterP.callCount, 5)
  t.true(doneP.calledOnceWith('error'))
})
