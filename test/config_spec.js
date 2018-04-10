const test = require('ava')
const sinon = require('sinon')
const config = require('../lib/config')

test.serial('defaults', t => {
  t.is(config.get('path'), 'api')
  t.is(config.get('circuitbreaker'), true)
  t.is(config.get('xxx'), undefined)
})

test.serial('set all configs once', t => {
  config.set({
    path: 'data',
    circuitbreaker: false,
    xxx: 'xxx'
  })

  t.is(config.get('path'), 'data')
  t.is(config.get('circuitbreaker'), false)
  t.is(config.get('xxx'), 'xxx')
})
