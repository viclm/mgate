const test = require('ava')
const sinon = require('sinon')
const config = require('../lib/config')

test.serial('set all configs once', t => {
  config.set({
    circuitbreaker: true,
    xxx: 'xxx'
  })

  t.is(config.get('circuitbreaker'), true)
  t.is(config.get('xxx'), 'xxx')
  t.is(config.circuitbreaker, true)
  t.is(config.xxx, 'xxx')
})
