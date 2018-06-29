const express = require('express')
const httproxy = require('../')

const app = express()

const proxy = httproxy({
  upload: {
    route: /upload/,
    files: 1,
    filesize: '5m',
    filetype: /image/
  }
})

proxy.on('http request', (res) => {
  console.log('[HTTP REQUEST LOG]', res.timing.stop)
})

proxy.on('http error', (err) => {
  console.log('[HTTP ERROR LOG]', err.message)
})

proxy.on('error', (err) => {
  console.log('[ERROR LOG]', err.message)
})

app.use(proxy)

app.listen(4869)
