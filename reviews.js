(() => {
  'use strict';
  const section = document.querySelector('#opinie');
  if (!section) return;
  const endpoint = section.dataset.reviewsEndpoint;
  // Configure a same-origin server endpoint only after connecting Google.
  if (!endpoint) return;
  const status = section.querySelector('[data-reviews-status]');
  const grid = section.querySelector('[data-reviews-grid]');
  const safeLink = value => {
    try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; }
    catch { return null; }
  };
  async function load() {
    try {
      const url = new URL(endpoint, location.href);
      if (url.origin !== location.origin) throw new Error('Invalid endpoint');
      const response = await fetch(url, {signal: AbortSignal.timeout(10000), credentials: 'omit'});
      if (!response.ok) throw new Error('Unavailable');
      const data = await response.json();
      if (!Array.isArray(data.reviews)) throw new Error('Invalid reviews');
      const reviews = data.reviews.filter(r => r && (r.rating === 4 || r.rating === 5)
        && typeof r.author === 'string' && typeof r.text === 'string' && safeLink(r.url)).slice(0,6);
      const fragment = document.createDocumentFragment();
      for (const review of reviews) {
        const card = document.createElement('article');
        card.className = 'review-card';
        const stars = document.createElement('p');
        stars.className = 'review-stars';
        stars.textContent = '★'.repeat(review.rating) + '☆'.repeat(5-review.rating);
        stars.setAttribute('aria-label', `${review.rating} na 5 gwiazdek`);
        const quote = document.createElement('blockquote');
        quote.textContent = review.text;
        const author = document.createElement(safeLink(review.authorUrl) ? 'a' : 'p');
        author.textContent = review.author;
        author.className = 'review-author';
        if (author.tagName === 'A') { author.href = safeLink(review.authorUrl); author.rel = 'noopener noreferrer'; author.target = '_blank'; }
        const link = document.createElement('a');
        link.href = safeLink(review.url); link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.className = 'review-source'; link.textContent = 'Przeczytaj w Google ↗';
        card.append(stars,quote,author,link); fragment.append(card);
      }
      grid.replaceChildren(fragment);
      grid.hidden = reviews.length === 0;
      status.hidden = reviews.length > 0;
      status.textContent = 'Nie ma jeszcze dostępnych opinii z oceną 4–5 gwiazdek.';
    } catch {
      status.hidden = false;
      status.textContent = 'Opinie są chwilowo niedostępne. Spróbuj ponownie później.';
    }
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); load(); }
    }, {rootMargin:'200px'});
    observer.observe(section);
  } else load();
})();
