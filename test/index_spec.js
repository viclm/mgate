const test = require('ava')
const express = require('express')

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

test('pass', t => {
  t.pass()
})
