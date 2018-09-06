module.exports = {
  address: '127.0.0.1:48690',
  protocol: 'grpc',
  idl: require('path').join(__dirname, '../../services/grpc/game.proto')
}
