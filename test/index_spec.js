const test = require('ava')
const express = require('express')
const config = require('../lib').config
const proxy = require('../lib').proxy

let app
let server
let remote

test.cb.before(t => {
  app = express()
  app.use('/api/:r', (req, res) => res.end(`[${req.method}]${req.params.r}`))
  server = app.listen(0, 'localhost', () => {
    remote = `http://localhost:${server.address().port}`
    t.end()
  })
})

test.after.always(t => {
  server.close()
})

test('proxy() is a singleton proxy function', async t => {
  t.plan(4)

  await proxy({
    xxx: {
      url: `${remote}/api/xxx`,
      method: 'get',
    }
  }, {
    onstat(requests) {
      t.is(requests.length, 1)
    }
  }).then(result => {
    t.deepEqual(result, { xxx: '[GET]xxx' })
  })

  const error = await t.throws(proxy({
    xxx: {
      url: `${remote}/error_api/xxx`,
      method: 'get',
    }
  }))

  t.is(error.status, 404)
})

test('config() is used for global config', async t => {
  t.plan(2)

  config({
    skipnull: false
  })

  await proxy({
    xxx: {
      fake: () => null
    }
  }).then(result => {
    t.deepEqual(result, { xxx: null })
  })

  await proxy({
    xxx: {
      fake: () => null
    }
  }, { skipnull: true }).then(result => {
    t.deepEqual(result, {})
  })

  config({
    skipnull: true
  })
})
