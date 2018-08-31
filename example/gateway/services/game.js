module.exports = {
  protocol: 'grpc',
  address: '127.0.0.1:48690',
  format: 'json',
  protobuf: require('path').join(__dirname, '../../services/grpc/game.proto')
}
