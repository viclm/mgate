exports.get = {
  pages: {
    fake() {
      return Math.ceil(Math.random() * 3)
    }
  },
  topnews: {
    url: 'https://api.dongqiudi.com/app/tabs/iphone/x.json',
    before(context, defaults) {
      return {
        url: defaults.url.replace(/x(?=\.json$)/, context.$iterator)
      }
    },
    after(context, defaults) {
      return defaults.articles
        .filter(article => !article.collection_type && !article.is_redirect_h5 && article.template === 'news.html')
        .map(article => article.title)
    },
    repeat(context) {
      return Array(context.pages + 1).join(0).split('').map((_, i) => ++i)
    }
  }
}
