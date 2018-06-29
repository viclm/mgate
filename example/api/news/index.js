exports.get = {
  '#ab': {
    fake() {
      return Math.random() > 0.5 ? 'hupu' : 'dongqiudi'
    }
  },
  hupu: {
    url: '/api/news/hupu',
    method: 'get',
    when(context) {
      return context.ab === 'hupu'
    }
  },
  dongqiudi: {
    url: '/api/news/dongqiudi',
    method: 'get',
    when(context) {
      return context.ab === 'dongqiudi'
    }
  }
}
