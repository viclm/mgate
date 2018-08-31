const stream = require('stream')
const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')

const connects = {}

function createGrpcClient(address, protobuf) {
  if (connects.address) {
    return connects.address
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
  connects[address] = client
  return client
}

exports.grpc = function grpcfunc(options, callback) {
  const client = createGrpcClient(options.address, options.protobuf)

  const req = {
    method: options.method,
    payload: options.payload,
  }
  const res = {
    timing: {
      start: new Date(),
      stop: null
    },
  }

  const call = client[options.method](options.payload, (err, data) => {
    res.timing.stop = new Date()
    callback(err, data, res, req)
  })

  const data = []
  call.on('data', chunk => {
    data.push(chunk)
  })
  call.on('end', () => {
    res.timing.stop = new Date()
    callback(null, data, res, req)
  })
  call.on('error', err => {
    res.timing.stop = new Date()
    callback(err, null, res, req)
  })
}

exports.fetch = async function fetch(options) {
  return await new Promise((resolve, reject) => {
    exports.grpc(options, (err, data, res, req) => {
      resolve({ err, data, res, req })
    })
  })
}
