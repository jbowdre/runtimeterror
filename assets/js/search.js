function displayResults (results, store) {
  const searchResults = document.getElementById('results');
  if (results.length) {
    let resultList = '';
    for (const n in results) {
      const item = store[results[n].ref];
      resultList += '<li><a href="' + item.url + '">' + item.title + '</a></li>'
      if (item.description)
        resultList += '<p>' + item.description + '</p>'
      else
        resultList += '<p>' + item.content.substring(0, 150) + '...</p>'
    }
    searchResults.innerHTML = resultList;
  } else {
    searchResults.innerHTML = 'No results found.';
  }
}
const params = new URLSearchParams(window.location.search);
const query = params.get('query');
if (query) {
  document.getElementById('search-query').setAttribute('value', query);
  const idx = lunr(function () {
    this.ref('id')
    this.field('title', {
      boost: 15
    })
    this.field('tags')
    this.field('content', {
      boost: 10
    })
    for (const key in window.store) {
      this.add({
        id: key,
        title: window.store[key].title,
        tags: window.store[key].tags,
        content: window.store[key].content
      })
    }
  })
  const results = idx.search(query);
  displayResults(results, window.store)
}


