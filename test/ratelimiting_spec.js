const test = require('ava')
const sinon = require('sinon')
const ratelimiting = require('../ratelimiting')

let clock

test.beforeEach(t => {
  clock = sinon.useFakeTimers()
})

test.afterEach(t => {
  clock.restore()
})

test.serial('use rate to control the drip speed', t => {

  ratelimiting.init('rate', {
    rate: 1
  })

  clock.tick(500)
  t.false(ratelimiting.consume('rate'))

  clock.tick(1000)
  t.true(ratelimiting.consume('rate'))
  t.false(ratelimiting.consume('rate'))

  clock.tick(1000)
  t.true(ratelimiting.consume('rate'))
  t.false(ratelimiting.consume('rate'))

})

test.serial('use capacity to limit the max operations', t => {
  
  ratelimiting.init('capacity1', {
    capacity: 10,
    rate: 10
  })

  clock.tick(500)
  t.true(ratelimiting.consume('capacity1'))
  t.true(ratelimiting.consume('capacity1'))
  t.true(ratelimiting.consume('capacity1'))
  t.true(ratelimiting.consume('capacity1'))
  t.true(ratelimiting.consume('capacity1'))
  t.false(ratelimiting.consume('capacity1'))

  ratelimiting.init('capacity2', {
    capacity: 1,
    rate: 10
  })

  clock.tick(500)
  t.true(ratelimiting.consume('capacity2'))
  t.false(ratelimiting.consume('capacity2'))

})
