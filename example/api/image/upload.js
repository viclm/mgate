exports.post = {
  upload: {
    files: 1,
    filesize: '5mb',
    filetype: /png/
  },
  rules: [
    {
      url: 'https://pasteboard.co/upload',
      method: 'post',
      datatype: 'form-data',
      timeout: 1000,
      after(context) {
        return 'https://cdn.pbrd.co/images/' + context.result.url.match(/[^/]+$/)[0]
      }
    }
  ]
}
