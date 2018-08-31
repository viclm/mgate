const mgate = require('../../')

const server = mgate({
  rules: 'api',
  upload: {
    route: /upload/,
    files: 1,
    filesize: '5m',
    filetype: /image/
  }
})

server.on('error', error => {
  console.log(error.stack)
})

server.start()
