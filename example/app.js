const httproxy = require('../')

const server = httproxy.createServer({
  rules: 'api',
  upload: {
    route: /upload/,
    files: 1,
    filesize: '5m',
    filetype: /image/
  }
})

server.on('error', error => {
  console.log(`[ERROR]code=${error.code}||message=${error.message}`)
})

server.on('request', requests => {
  requests.forEach(r => {
    const { request, response, error } = r
    let message = `[HTTP]url=${request.url}||method=${request.method}`
    if (error) {
      message += `||error=${error.message}`
    }
    else {
      message += `||duration=${new Date(response.timing.stop) - new Date(response.timing.start)}`
    }
    console.log(message)
  })
})

server.start()
