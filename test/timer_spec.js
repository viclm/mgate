const test = require('ava')
const sinon = require('sinon')
const timer = require('../utils/timer')

let clock

test.beforeEach(t => {
  clock = sinon.useFakeTimers()
})

test.afterEach(t => {
  clock.restore()
})

test.serial('single callback', t => {
  const callback = sinon.spy()

  timer.delay(1, callback)

  clock.tick(999)
  t.true(callback.notCalled)
  t.true(timer.running())

  clock.tick(1)
  t.true(callback.calledOnce)
  t.false(timer.running())

  clock.tick(1000)
  t.true(callback.calledOnce)

})

test.serial('multiple callback', t => {
  const callbackA = sinon.spy()
  const callbackB = sinon.spy()
  const callbackC = sinon.spy()

  timer.delay(1, callbackA)
  timer.delay(2, callbackB)

  clock.tick(999)
  t.true(callbackA.notCalled)
  t.true(callbackB.notCalled)
  t.true(timer.running())

  clock.tick(1)
  t.true(callbackA.calledOnce)
  t.false(callbackB.calledOnce)
  t.true(timer.running())

  timer.delay(1, callbackC)

  clock.tick(1000)
  t.true(callbackA.calledOnce)
  t.true(callbackB.calledOnce)
  t.true(callbackC.calledOnce)
  t.false(timer.running())

})
