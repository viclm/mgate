const winston = require('winston')

const format = winston.format

const defaultFormat = format.printf(info => {
  let message
  switch (info.label) {
    case 'http':
      message = `[${info.label}] ${info.level}: ${info.message.req.url}`
      break
    case 'grpc':
      message = `[${info.label}] ${info.level}: ${info.message.method}`
      break
    default:
      message = `[${info.label}] ${info.level}: ${info.message}`
  }
  return message
})

const logger = winston.createLogger({
  format: format.combine(
    format.colorize(),
    defaultFormat
  ),
  transports: [
    new winston.transports.Console()
  ]
})

logger.http = function httpLogger(message) {
  logger.info({
    label: 'http',
    message
  })
}

logger.grpc = function grpcLogger(message) {
  logger.info({
    label: 'grpc',
    message
  })
}

module.exports = logger
