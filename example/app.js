const httproxy = require('../')

const server = httproxy.serve(4869, {
  upload: {
    route: /upload/,
    files: 1,
    filesize: '5m',
    filetype: /image/
  }
})

server.on('info', message => {
  console.log(`[INFO]message=${message}`)
})

server.on('error', error => {
  console.log(`[ERROR]code=${error.code}||message=${error.message}`)
})

server.on('http', ({ error, response, request }) => {
  console.log(`[HTTP]url=${request.url}||method=${request.method}||time=${response.timing.stop}`)
})
