exports.post = {
  image: {
    url: 'https://pasteboard.co/upload',
    method: 'post',
    datatype: 'form-data',
    timeout: 3000,
    before(context) {
      return {
        data: context.$client
      }
    },
    after(context, defaults) {
      return 'https://cdn.pbrd.co/images/' + defaults.url.match(/[^/]+$/)[0]
    },
    fallback() {
      return ''
    }
  }
}
