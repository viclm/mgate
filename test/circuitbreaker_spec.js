const test = require('ava')
const sinon = require('sinon')
const circuitbreaker = require('../circuitbreaker')

let clock

test.before(t => {
  clock = sinon.useFakeTimers()
})

test.after.always(t => {
  clock.restore()
})

test.serial('break request if the rate of failure reatches the threshold over time', async t => {
  const cb = new circuitbreaker.CircuitBreaker(10, undefined, 0.5)
  const available = () => {}
  const unavailable = () => { throw new Error('unavailable') }

  t.is(cb.state, 'close')

  cb.call(available)
  await t.throws(cb.call(unavailable))

  clock.tick(10000)
  t.is(cb.state, 'open')

  await t.throws(cb.call(available))
})

test.serial('turn on a limit traffic after breaker is open for a while', async t => {
  const cb = new circuitbreaker.CircuitBreaker(10, 5, 0.5)
  const available = () => {}
  const unavailable = () => { throw new Error('unavailable') }

  t.is(cb.state, 'close')

  cb.call(available)
  await t.throws(cb.call(unavailable))

  clock.tick(10000)
  t.is(cb.state, 'open')

  clock.tick(5000)
  t.is(cb.state, 'harfopen')

  await t.throws(cb.call(unavailable))

  clock.tick(10000)
  t.is(cb.state, 'open')

  clock.tick(5000)
  t.is(cb.state, 'harfopen')

  cb.call(available)

  clock.tick(10000)
  t.is(cb.state, 'close')
})
