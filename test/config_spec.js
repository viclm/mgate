const test = require('ava')
const sinon = require('sinon')
const config = require('../lib/config')

test('set all configs once', t => {
  config.set({
    x1: 'x1'
  })

  t.is(config.x1, 'x1')
})

test('lookup rule by path and method', t => {
  t.falsy(config.rule('xxx', 'get'))

  config.set('rules', [
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
  ])

  t.is(config.rule('/xxx', 'get'), 'xxx')
  t.is(config.rule('/yyy/zzz', 'post'), 'yyy')
  t.falsy(config.rule('/yyy/zzz', 'get'))
})

// test('plain object argument use a shallow copy, and boolean is used for quick setup', t => {
//   const obj = {
//     x1: { x1: 'x1' },
//     x2: { x2: 'x2' },
//     x3: { x3: 'x3' },
//   }

//   config.$extend(obj, {
//     x1: true,
//     x2: false,
//     x3: { x3: 'x', x4: 'xx' }
//   })

//   t.deepEqual(obj.x1, { x1: 'x1' })
//   t.is(obj.x2, false)
//   t.deepEqual(obj.x3, { x3: 'x', x4: 'xx' })
// })
