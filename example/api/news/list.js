exports.get = {
  rules: [
    {
      fake(context) {
        return Math.random() > 0.5 ? 'dongqiudi' : 'hupu'
      },
    },
    [
      {
        url: 'https://api.dongqiudi.com/app/tabs/iphone/1.json',
        before() {
          return {
            data: {
              page: 1
            }
          }
        },
        after(context) {
          return context.result.articles
            .filter(article => !article.collection_type && !article.is_redirect_h5 && article.template === 'news.html')
            .map(article => {
              return {
                title: article.title
              }
            })
        },
        when(context) {
          return context.parent === 'dongqiudi'
        },
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
        after(context) {
          return context.result.result
            .map(article => {
              return {
                title: article.title
              }
            })
        },
        when(context) {
          return context.parent === 'hupu'
        },
      },
    ],
    {
      fake(context) {
        return context.parent[0] || context.parent[1]
      }
    }
  ],
}
