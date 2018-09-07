const stream = require('stream')
const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')
const logger = require('../utils/logger')

const Connects = {}

function createGrpcClient(address, protobuf) {
  if (Connects[address]) {
    return Connects[address]
  }
  const packageDefinition = grpc.loadPackageDefinition(
    protoLoader.loadSync(protobuf, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    })
  )
  const packageName = Object.keys(packageDefinition)[0]
  const serviceName = Object.keys(packageDefinition[packageName])[0]
  const client = new packageDefinition[packageName][serviceName](address, grpc.credentials.createInsecure())
  Connects[address] = client
  return client
}

exports.grpc = function grpcfunc(options, callback) {
  const client = createGrpcClient(options.service.address, options.service.idl)

  const call = client[options.method](options.payload, (err, data) => {
    logger.grpc({
      method: options.method,
      payload: options.payload,
      result: data,
      error: err
    })
    callback(err, data)
  })

  const data = []
  call.on('data', chunk => {
    data.push(chunk)
  })
  call.on('end', () => {
    logger.grpc({
      method: options.method,
      payload: options.payload,
      result: data,
      error: null
    })
    callback(null, data)
  })
  call.on('error', err => {
    logger.grpc({
      method: options.method,
      payload: options.payload,
      result: null,
      error: err
    })
    callback(err)
  })
}

exports.fetch = async function fetch(options) {
  return await new Promise((resolve, reject) => {
    exports.grpc(options, (err, result) => {
      if (err) {
        reject(err)
      }
      else {
        resolve(result)
      }
    })
  })
}
