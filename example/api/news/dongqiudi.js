exports.get = {
  pages: {
    fake() {
      return Math.ceil(Math.random() * 3)
    }
  },
  topnews: {
    url: 'https://api.dongqiudi.com/app/tabs/iphone/x.json',
    before(context, defaults) {
      const repeats = []
      for (let i = 0 ; i < context.pages ; i++) {
        repeats.push({ url: defaults.url.replace(/x(?=\.json$)/, i) })
      }
      return repeats
    },
    after(context, defaults) {
      return defaults
        .reduce((arr, item) => arr.concat(item.articles), [])
        .filter(article => !article.collection_type && !article.is_redirect_h5 && article.template === 'news.html')
        .map(article => article.title)
    }
  }
}
