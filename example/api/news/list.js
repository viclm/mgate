exports.get = {
  serial: [
    {
      fake(context) {
        return Math.random() > 0.5 ? 'dongqiudi' : 'hupu'
      },
      key: 'abtest'
    },
    {
      url: 'https://api.dongqiudi.com/app/tabs/iphone/1.json',
      before() {
        return {
          data: {
            page: 1
          }
        }
      },
      after(context, result) {
        return result.articles
          .filter(article => !article.collection_type && !article.is_redirect_h5 && article.template === 'news.html')
          .map(article => {
            return {
              title: article.title
            }
          })
      },
      when(context) {
        return context.abtest.result === 'dongqiudi'
      },
      key: 'dongqiudi'
    },
    {
      url: 'https://soccer.hupu.com/home/latest-news',
      before() {
        return {
          data: {
            league: '最新',
            page: 1
          }
        }
      },
      after(context, result) {
        return result.result.map(article => {
          return {
            title: article.title
          }
        })
      },
      when(context) {
        return context.abtest.result === 'hupu'
      },
      key: 'hupu'
    },
  ],
}
