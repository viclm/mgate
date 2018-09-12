const mgate = require('../../')

mgate({
  upload: {
    route: /upload/,
    files: 1,
    filesize: '5m',
    filetype: /image/
  }
})
