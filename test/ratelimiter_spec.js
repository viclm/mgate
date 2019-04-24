const test = require('ava')
const sinon = require('sinon')
const ratelimiter = require('../ratelimiter')

let clock

test.beforeEach(t => {
  clock = sinon.useFakeTimers()
})

test.afterEach(t => {
  clock.restore()
})

test.serial('qps limiting', t => {

  const rl = new ratelimiter.RateLimiter(1, 1)

  t.true(rl.acquire())
  t.false(rl.acquire())

  clock.tick(1000)
  t.true(rl.acquire())
  t.false(rl.acquire())

})

test.serial('allow burst', t => {

  const rl = new ratelimiter.RateLimiter(1, 1)

  clock.tick(5000)
  t.true(rl.acquire())
  t.true(rl.acquire())
  t.false(rl.acquire())

  const r2 = new ratelimiter.RateLimiter(1, 2)

  clock.tick(5000)
  t.true(r2.acquire())
  t.true(r2.acquire())
  t.true(r2.acquire())
  t.false(r2.acquire())

})

test.serial('allow acquire more permits', t => {

  const rl = new ratelimiter.RateLimiter(1, 1)

  t.true(rl.acquire(2))
  t.false(rl.acquire())

  clock.tick(1000)
  t.false(rl.acquire())

  clock.tick(1000)
  t.true(rl.acquire())

})

test.serial('create wrapper for RateLimiter class', t => {

  const rl = ratelimiter.create(10)

  t.true(rl instanceof ratelimiter.RateLimiter)

})
