exports.get = {

  '#index': {
    fake() {
      return Math.round(Math.random() * 4)
    }
  },

  league: {
    fake(context) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve([
            '意甲',
            '英超',
            '西甲',
            '德甲',
            '中超',
          ][context.index])
        }, 200)
      })
    }
  },

  topnews: {
    url: 'https://soccer.hupu.com/home/latest-news',
    before(context) {
      return {
        data: {
          league: context.league,
          page: 1
        }
      }
    },
    after(context, defaults) {
      return defaults.result
        .map(article => article.title)
    }
  }

}
