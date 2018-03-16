exports.get = {
  parallel: [
    {
      url: 'https://api.dongqiudi.com/v2/article/detail/xxxxxxx',
      before(context, request) {
        return Promise.resolve({
          url: request.url.replace('xxxxxxx', request.data.id),
          data: {}
        })
      },
      after(context, result) {
        return {
          code: result.code,
          message: result.message,
          data: result.data && {
            body: result.data.body
          }
        }
      },
      key: 'detail'
    },
    {
      url: 'https://api.dongqiudi.com/v2/article/relative/xxxxxxx',
      before(context, request) {
        return {
          url: request.url.replace('xxxxxxx', request.data.id),
          data: {}
        }
      },
      after(context, result) {
        return result.relative
      },
      key: 'relative'
    }
  ]
}
