const http = require('http')
const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')

const packageDefinition = protoLoader.loadSync(__dirname + '/game.proto', {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
})

const game = grpc.loadPackageDefinition(packageDefinition).game;

const server = new grpc.Server()

server.addService(game.Game.service, {
  sanguosha(call) {
    http.get('http://www.sanguosha.com/msgs/mApi/cur/1', response => {
      let data = ''
      response.on('data', chunk => {
        data += chunk.toString()
      })
      response.on('end', () => {
        JSON.parse(data).forEach(item => {
          call.write(item)
        })
        call.end()
      })
    })
  },
  xbox(call, callback) {
    http.get(`http://m.xboxone.tgbus.com/api/action.ashx?type=list7&domain=m.xboxone.tgbus.com&pageno=${call.request.pageno}&size=${call.request.size}`, response => {
      let data = ''
      response.on('data', chunk => {
        data += chunk.toString()
      })
      response.on('end', () => {
        callback(null, JSON.parse(data))
      })
    }).on('error', callback)
  }
})

server.bind('127.0.0.1:48690', grpc.ServerCredentials.createInsecure())
server.start()
