const test = require('ava')
const sinon = require('sinon')
const express = require('express')
const util = require('util')
const option = require('../lib/util/option')
const proxy = util.promisify(require('../lib/proxy'))

let app
let server

test.cb.before(t => {
  app = express()
  app.use('/api/:r', (req, res) => { res.end(`[${req.method}]${req.params.r}`) })
  server = app.listen(0, 'localhost', t.end)
})

test.after.always(t => {
  server.close()
})

const resolveRequestOptions = (options) => {
  return Object.assign({
    when: option.wrap(),
    before: option.wrap(),
    after: option.wrap(),
  }, options)
}

test('proxy single request', async t => {
  t.plan(3)

  await proxy({}, {
    rules: [
      resolveRequestOptions({
        url: 'http://localhost:' + server.address().port + '/api/xxx',
        method: 'get',
      })
    ]
  }).then(result => t.is(result, '[GET]xxx'))

  const error = await t.throws(proxy({}, {
    rules: [
      resolveRequestOptions({
        url: 'http://localhost:' + server.address().port + '/error_api/xxx',
        method: 'get',
      })
    ]
  }))

  t.is(error.status, 404)

})

test('merge multiple serial request', async t => {
  t.plan(1)

  await proxy({}, {
    rules: [
      resolveRequestOptions({
        url: 'http://localhost:' + server.address().port + '/api/x1',
        method: 'get',
      }),
      resolveRequestOptions({
        url: 'http://localhost:' + server.address().port + '/api/x2',
        method: 'get',
      })
    ]
  }).then(result => t.is(result, '[GET]x2'))
})

test('merge multiple parallel request', async t => {
  t.plan(1)

  await proxy({}, {
    rules: [
      [
        resolveRequestOptions({
          url: 'http://localhost:' + server.address().port + '/api/x1',
          method: 'get',
        }),
        resolveRequestOptions({
          url: 'http://localhost:' + server.address().port + '/api/x2',
          method: 'get',
        })
      ]
    ]
  }).then(result => t.deepEqual(result, ['[GET]x1', '[GET]x2']))
})

test('use when to skip a request', async t => {
  t.plan(1)

  await proxy({}, {
    rules: [
      resolveRequestOptions({
        url: 'http://localhost:' + server.address().port + '/api/x1',
        method: 'get',
      }),
      resolveRequestOptions({
        url: 'http://localhost:' + server.address().port + '/api/x2',
        method: 'get',
        when: option.wrap(() => false)
      })
    ]
  }).then(result => t.is(result, '[GET]x1'))
})

test('use before to change the request options', async t => {
  t.plan(1)

  await proxy({}, {
    rules: [
      resolveRequestOptions({
        url: 'http://localhost:' + server.address().port + '/api/xxx',
        method: 'get',
        before: option.wrap(() => {
          return {
            method: 'post'
          }
        })
      }),
    ]
  }).then(result => t.is(result, '[POST]xxx'))
})

test('use after to change the result', async t => {
  t.plan(1)

  await proxy({}, {
    rules: [
      resolveRequestOptions({
        url: 'http://localhost:' + server.address().port + '/api/xxx',
        method: 'get',
        after: option.wrap(() => {
          return 'custom result'
        })
      }),
    ]
  }).then(result => t.is(result, 'custom result'))
})

test('use fake to custom a request completely', async t => {
  t.plan(1)

  await proxy({}, {
    rules: [
      resolveRequestOptions({
        fake: option.wrap(() => {
          return 'fake result'
        })
      }),
    ]
  }).then(result => t.is(result, 'fake result'))
})

test('use fallback to output defaults when a request broken', async t => {
  t.plan(1)

  await proxy({}, {
    rules: [
      resolveRequestOptions({
        url: 'http://localhost:' + server.address().port + '/error_api/xxx',
        method: 'get',
        fallback: option.wrap(() => {
          return 'fallback result'
        })
      }),
    ]
  }).then(result => t.is(result, 'fallback result'))
})
