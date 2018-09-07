const mgate = require('../../')

const server = mgate({
  upload: {
    route: /upload/,
    files: 1,
    filesize: '5m',
    filetype: /image/
  }
})

server.start()
