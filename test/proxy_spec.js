const test = require('ava')
const sinon = require('sinon')
const express = require('express')
const pify = require('pify')
const option = require('../lib/util/option')
const proxy = pify(require('../lib/proxy'))

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

const allProxyOptions = {
  get() {}
}

const createProxyOptions = options => {
  const resolve = rules => {
    return rules.map(o => {
      if (Array.isArray(o)) {
        return resolve(o)
      }
      o = Object.assign({
        when: option.wrap(),
        before: option.wrap(),
        after: option.wrap(),
      }, o)
      if (o.url) {
        o.url = 'http://localhost:' + server.address().port + o.url
      }
      return o
    })
  }
  options.rules = resolve(options.rules)
  return options
}

test('proxy single request', async t => {
  t.plan(3)

  await proxy({}, createProxyOptions({
    rules: [
      {
        url: '/api/xxx',
        method: 'get',
      }
    ]
  }), allProxyOptions).then(result => t.is(result, '[GET]xxx'))

  const error = await t.throws(proxy({}, createProxyOptions({
    rules: [
      {
        url: '/error_api/xxx',
        method: 'get',
      }
    ]
  }), allProxyOptions))

  t.is(error.status, 404)

})

test('merge multiple serial request', async t => {
  t.plan(1)

  await proxy({}, createProxyOptions({
    rules: [
      {
        url: '/api/x1',
        method: 'get',
      },
      {
        url: '/api/x2',
        method: 'get',
      }
    ]
  }), allProxyOptions).then(result => t.is(result, '[GET]x2'))
})

test('merge multiple parallel request', async t => {
  t.plan(1)

  await proxy({}, createProxyOptions({
    rules: [
      [
        {
          url: '/api/x1',
          method: 'get',
        },
        {
          url: '/api/x2',
          method: 'get',
        }
      ]
    ]
  }), allProxyOptions).then(result => t.deepEqual(result, ['[GET]x1', '[GET]x2']))
})

test('use when to skip a request', async t => {
  t.plan(1)

  await proxy({}, createProxyOptions({
    rules: [
      {
        url: '/api/x1',
        method: 'get',
      },
      {
        url: '/api/x2',
        method: 'get',
        when: option.wrap(() => false)
      }
    ]
  }), allProxyOptions).then(result => t.is(result, '[GET]x1'))
})

test('use before to change the request options', async t => {
  t.plan(1)

  await proxy({}, createProxyOptions({
    rules: [
      {
        url: '/api/xxx',
        method: 'get',
        before: option.wrap(() => {
          return {
            method: 'post'
          }
        })
      },
    ]
  }), allProxyOptions).then(result => t.is(result, '[POST]xxx'))
})

test('use after to change the result', async t => {
  t.plan(1)

  await proxy({}, createProxyOptions({
    rules: [
      {
        url: '/api/xxx',
        method: 'get',
        after: option.wrap(() => {
          return 'custom result'
        })
      },
    ]
  }), allProxyOptions).then(result => t.is(result, 'custom result'))
})

test('use fake to custom a request completely', async t => {
  t.plan(1)

  await proxy({}, createProxyOptions({
    rules: [
      {
        fake: option.wrap(() => {
          return 'fake result'
        })
      },
    ]
  }), allProxyOptions).then(result => t.is(result, 'fake result'))
})

test('use fallback to output defaults when a request broken', async t => {
  t.plan(1)

  await proxy({}, createProxyOptions({
    rules: [
      {
        url: '/error_api/xxx',
        method: 'get',
        fallback: option.wrap(() => {
          return 'fallback result'
        })
      },
    ]
  }), allProxyOptions).then(result => t.is(result, 'fallback result'))
})
