const test = require('ava')
const rules = require('../lib/rules')

test('rules is an array', t => {
  t.true(Array.isArray(rules))
})

test('get is a proxy method for lookup', t => {
  t.falsy(rules.get('xxx', 'get'))

  rules.push(
    {
      path: '/xxx',
      method: 'get',
      graph: 'xxx'
    },
    {
      path: '/yyy/*',
      method: 'post',
      graph: 'yyy'
    }
  )

  t.is(rules.get('/xxx', 'get'), 'xxx')
  t.is(rules.get('/yyy/zzz', 'post'), 'yyy')
  t.falsy(rules.get('/yyy/zzz', 'get'))
})
