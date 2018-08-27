const test = require('ava')
const sinon = require('sinon')
const circuitbreaker = require('../circuitbreaker')

const uri = 'http://upstream.com/gateway/resource#post'

let clock

test.beforeEach(t => {
  clock = sinon.useFakeTimers()
})

test.afterEach(t => {
  clock.restore()
})

test.serial('break request if there are more failures in 10 seconds', t => {
  circuitbreaker.monitor(uri)

  t.truthy(circuitbreaker.stat(uri))
  t.is(circuitbreaker.stat(uri).status, 'close')
  t.false(circuitbreaker.check(uri))

  circuitbreaker.record(uri, false)
  circuitbreaker.record(uri, true)
  circuitbreaker.record(uri, false)
  circuitbreaker.record(uri, true)
  circuitbreaker.record(uri, false)

  clock.tick(10000)
  t.is(circuitbreaker.stat(uri).status, 'open')
  t.true(circuitbreaker.check(uri))

  clock.tick(15000)
  t.falsy(circuitbreaker.stat(uri))
  t.false(circuitbreaker.check(uri))
})

test.serial('turn on small traffic test after 5 seconds if breaker is open', t => {
  circuitbreaker.monitor(uri)

  circuitbreaker.record(uri, false)

  clock.tick(10000)
  t.is(circuitbreaker.stat(uri).status, 'open')

  clock.tick(5000)
  t.is(circuitbreaker.stat(uri).status, 'harfopen')

  circuitbreaker.record(uri, false)

  clock.tick(10000)
  t.is(circuitbreaker.stat(uri).status, 'open')
  t.true(circuitbreaker.check(uri))

  clock.tick(5000)
  t.is(circuitbreaker.stat(uri).status, 'harfopen')
  let isBlocking = circuitbreaker.check(uri)
  while (isBlocking === circuitbreaker.check(uri)) {}

  circuitbreaker.record(uri, true)

  clock.tick(10000)
  t.falsy(circuitbreaker.stat(uri))
  t.false(circuitbreaker.check(uri))
})
