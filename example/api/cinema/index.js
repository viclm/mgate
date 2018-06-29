exports.post = {
  _: {
    url: 'https://etmdb.com/graphql',
    method: 'post',
    datatype: 'json',
    timeout: 3000,
    before(context) {
      return {
        data: context.$client
      }
    },
    fallback() {
      return []
    }
  }
}
