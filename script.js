document.addEventListener('DOMContentLoaded', () => {
  const igCheckbox = document.getElementById('instagramCheckbox');
  const igFileInput = document.getElementById('igFile');
  const compareBtn = document.getElementById('compareBtn');
  const clearBtn = document.getElementById('clearBtn');
  const resultDiv = document.getElementById('result');
  const timestampDiv = document.getElementById('timestamp');
  const listAInput = document.getElementById('listA');
  const listBInput = document.getElementById('listB');
  const darkModeCheckbox = document.getElementById('darkModeCheckbox');
  const newsList = document.getElementById('newsList');
  const mqDataDiv = document.getElementById('mqData');

  let igUsernames = [];

  /* =========================
     Dark Mode Toggle
  ========================== */
  darkModeCheckbox.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode', darkModeCheckbox.checked);
  });

  /* =========================
     Instagram JSON Upload
  ========================== */
  igFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    igCheckbox.checked = true;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        igUsernames = extractInstagramUsernames(json);
        listAInput.value = igUsernames.join('\n');
      } catch (err) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  });

  function extractInstagramUsernames(json) {
    const names = [];
    function search(obj) {
      if (Array.isArray(obj)) obj.forEach(search);
      else if (typeof obj === 'object' && obj !== null) {
        if (obj.value) names.push(obj.value);
        Object.values(obj).forEach(search);
      }
    }
    search(json);
    return names;
  }

  /* =========================
     Compare Lists
  ========================== */
  function compareLists() {
    const listAraw = listAInput.value.split(/\s+/).filter(Boolean);
    const listBraw = listBInput.value.split(/\s+/).filter(Boolean);

    const listA = new Set(listAraw);
    const listB = new Set(listBraw);

    const onlyA = [...listA].filter(x => !listB.has(x));
    const onlyB = [...listB].filter(x => !listA.has(x));
    const inBoth = [...listA].filter(x => listB.has(x));

    let html = '';
    html += `<div class="result-heading">Only in A:</div> ${onlyA.join(', ') || 'None'}<br>`;
    html += `<div class="result-heading">Only in B:</div> ${onlyB.join(', ') || 'None'}<br>`;
    html += `<div class="result-heading">In Both:</div> ${inBoth.join(', ') || 'None'}`;

    resultDiv.innerHTML = html;
    resultDiv.scrollTop = resultDiv.scrollHeight;

    timestampDiv.textContent = `Last comparison: ${new Date().toLocaleString()}`;
  }

  compareBtn.addEventListener('click', compareLists);

  clearBtn.addEventListener('click', () => {
    listAInput.value = '';
    listBInput.value = '';
    resultDiv.innerHTML = '';
    timestampDiv.textContent = '';
    igFileInput.value = '';
    igCheckbox.checked = false;
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      compareLists();
    }
  });

  /* =========================
     Investment News (RSS)
  ========================== */
  async function fetchNews() {
    const feeds = [
      'https://www.marketwatch.com/rss/topstories',
      'https://www.investopedia.com/feedbuilder/feed/getfeed?category=Investing',
      'https://www.reuters.com/technology/rss'
    ];

    newsList.innerHTML = '<li>Loading news...</li>';

    try {
      const allNews = [];
      for (const feed of feeds) {
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}`);
        const data = await response.json();
        if (data.items) {
          data.items.slice(0, 5).forEach(item => {
            allNews.push({ title: item.title, link: item.link });
          });
        }
      }

      newsList.innerHTML = '';
      allNews.forEach(item => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = item.link;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = item.title;
        li.appendChild(a);
        newsList.appendChild(li);
      });
    } catch (err) {
      newsList.innerHTML = '<li>Unable to load news.</li>';
    }
  }

  fetchNews();
  setInterval(fetchNews, 5 * 60 * 1000); // update every 5 minutes

  /* =====================================================
     Gartner Magic Quadrant "Leaders" – Public Signals
     - Pulls fresh posts mentioning "Gartner" + "Magic Quadrant"
     - Biases to the current year (2025)
     - Enriches with fundamentals via Yahoo Finance (best-effort)
     - Caches for 6 hours in localStorage
  ====================================================== */

  // Public feeds to scan (CORS-friendly via rss2json). Add/remove as you like.
  const MQ_FEEDS = [
    // AWS News Blog (verified feed)
    { vendor: 'Amazon (AWS)', ticker: 'AMZN', url: 'https://aws.amazon.com/blogs/aws/feed/' },
    // Microsoft official/property feeds
    { vendor: 'Microsoft', ticker: 'MSFT', url: 'https://blogs.microsoft.com/feed/' },
    { vendor: 'Microsoft Azure', ticker: 'MSFT', url: 'https://azure.microsoft.com/en-us/blog/feed/' }, // product blog feeds exist per area
    { vendor: 'Microsoft Power BI', ticker: 'MSFT', url: 'https://powerbi.microsoft.com/en-us/blog/feed/' },
    // Google Cloud (common community-documented feed)
    { vendor: 'Google Cloud', ticker: 'GOOGL', url: 'https://cloudblog.withgoogle.com/rss/' },
    // General tech news (sometimes carries vendor press releases w/ MQ mentions)
    { vendor: 'Reuters Tech', ticker: null, url: 'https://www.reuters.com/technology/rss' }
  ];

  const MQ_CACHE_KEY = 'mq_leaders_cache_v3';
  const MQ_CACHE_MS = 6 * 60 * 60 * 1000; // 6 hours
  const CURRENT_YEAR = new Date().getFullYear();
  const MQ_YEAR_PREFERENCE = 2025; // prioritize 2025 mentions right now

  // Put a refresh button under the MQ title
  (function injectRefreshButton() {
    const wrapper = document.getElementById('mq-dashboard');
    if (!wrapper) return;
    const btn = document.createElement('button');
    btn.id = 'mqRefreshBtn';
    btn.textContent = 'Refresh Leaders';
    btn.style.marginTop = '10px';
    btn.addEventListener('click', () => {
      loadMagicQuadrant(true);
    });
    // Only add once, and place it right after the H2
    const h2 = wrapper.querySelector('h2');
    if (h2 && !wrapper.querySelector('#mqRefreshBtn')) {
      h2.insertAdjacentElement('afterend', btn);
    }
  })();

  async function loadMagicQuadrant(force = false) {
    try {
      // Try cache
      if (!force) {
        const cached = JSON.parse(localStorage.getItem(MQ_CACHE_KEY) || 'null');
        if (cached && (Date.now() - cached.savedAt) < MQ_CACHE_MS) {
          renderMQCards(cached.items, cached.fallbackUsed);
          return;
        }
      }

      // Show a loading state
      mqDataDiv.innerHTML = `<div class="mq-grid"><div class="mq-card"><p>Loading Magic Quadrant updates…</p></div></div>`;

      const found = await scanFeedsForMagicQuadrant();
      let items = found;

      // If nothing matched, fall back to last year too
      if (items.length === 0) {
        const foundLoose = await scanFeedsForMagicQuadrant({ includePrevYear: true, loosenKeywords: true });
        items = foundLoose;
      }

      let fallbackUsed = false;
      if (items.length === 0) {
        // Final fallback: show static samples so the section isn’t empty
        fallbackUsed = true;
        items = [
          {
            vendor: 'Microsoft',
            title: 'Sample: Recognized as a Leader in the Gartner Magic Quadrant for Analytics & BI Platforms',
            link: '#',
            pubDate: new Date().toISOString(),
            categoryGuess: 'Analytics & BI Platforms',
            ticker: 'MSFT'
          },
          {
            vendor: 'Amazon (AWS)',
            title: 'Sample: Named a Leader in the Gartner Magic Quadrant for Cloud Infrastructure & Platform Services',
            link: '#',
            pubDate: new Date().toISOString(),
            categoryGuess: 'Cloud Infrastructure & Platform Services',
            ticker: 'AMZN'
          },
          {
            vendor: 'Google Cloud',
            title: 'Sample: Positioned as a Leader in the Gartner Magic Quadrant for Cloud AI Developer Services',
            link: '#',
            pubDate: new Date().toISOString(),
            categoryGuess: 'Cloud AI Developer Services',
            ticker: 'GOOGL'
          }
        ];
      }

      // Enrich with fundamentals (best effort; if blocked, we just skip)
      await enrichWithFundamentals(items);

      // Save cache
      localStorage.setItem(MQ_CACHE_KEY, JSON.stringify({
        items,
        savedAt: Date.now(),
        fallbackUsed
      }));

      // Render
      renderMQCards(items, fallbackUsed);
    } catch (err) {
      mqDataDiv.innerHTML = `<div class="mq-grid"><div class="mq-card"><p>Could not load Magic Quadrant updates right now.</p></div></div>`;
    }
  }

  function buildRssProxyUrl(feedUrl) {
    return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
  }

  function extractCategoryFromTitle(title) {
    // Heuristic: text after "Magic Quadrant" and optional "for"
    const m = title.match(/Magic Quadrant(?:\s*for)?\s*([^:\-\–\|]+)?/i);
    if (m && m[1]) return m[1].trim();
    return null;
  }

  function isMagicQuadrantHit(item, opts = {}) {
    const { loosenKeywords = false } = opts || {};
    const t = `${item.title || ''} ${item.description || ''}`.toLowerCase();

    const hasGartner = t.includes('gartner');
    const hasMQ = t.includes('magic quadrant') || (loosenKeywords && (t.includes('mq report') || t.includes('gartner quadrant')));

    return hasGartner && hasMQ;
  }

  function withinYearPreference(dateStr, opts = {}) {
    const { includePrevYear = false } = opts || {};
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true; // if unknown, don’t filter out
    const y = d.getFullYear();
    if (y === MQ_YEAR_PREFERENCE) return true;
    if (includePrevYear && (y === MQ_YEAR_PREFERENCE - 1)) return true;
    return false;
  }

  async function scanFeedsForMagicQuadrant(options = {}) {
    const { includePrevYear = false, loosenKeywords = false } = options;
    const results = [];

    // Fetch all feeds in parallel
    const tasks = MQ_FEEDS.map(async ({ vendor, ticker, url }) => {
      try {
        const res = await fetch(buildRssProxyUrl(url));
        const data = await res.json();
        const items = (data.items || []).filter(it => {
          return isMagicQuadrantHit(it, { loosenKeywords }) && withinYearPreference(it.pubDate, { includePrevYear });
        });

        // Take the latest 1–2 per vendor
        items.slice(0, 2).forEach(it => {
          results.push({
            vendor,
            title: it.title,
            link: it.link,
            pubDate: it.pubDate,
            categoryGuess: extractCategoryFromTitle(it.title) || 'Magic Quadrant',
            ticker: ticker || null
          });
        });
      } catch (e) {
        // Ignore this feed on failure
      }
    });

    await Promise.all(tasks);

    // De-duplicate by vendor + title
    const seen = new Set();
    const deduped = [];
    for (const r of results) {
      const key = `${r.vendor}::${r.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(r);
      }
    }

    // Sort newest first
    deduped.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    return deduped;
  }

  async function enrichWithFundamentals(items) {
    // Group unique tickers
    const tickers = [...new Set(items.map(i => i.ticker).filter(Boolean))];
    if (tickers.length === 0) return;

    // Try Yahoo Finance quote endpoint (CORS often works; if not, we silently skip)
    // Example: https://query1.finance.yahoo.com/v7/finance/quote?symbols=MSFT,AMZN
    for (const tk of tickers) {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(tk)}`);
        const data = await res.json();
        const q = data && data.quoteResponse && data.quoteResponse.result && data.quoteResponse.result[0];
        if (!q) continue;

        const fundamentals = {
          price: q.regularMarketPrice,
          marketCap: q.marketCap,
          pe: q.trailingPE
        };

        // Attach to all items with this ticker
        items.forEach(it => {
          if (it.ticker === tk) {
            it.fundamentals = fundamentals;
          }
        });
      } catch {
        // Skip on error/cors
      }
    }
  }

  function humanMarketCap(n) {
    if (typeof n !== 'number' || !isFinite(n)) return '—';
    const abs = Math.abs(n);
    if (abs >= 1e12) return (n / 1e12).toFixed(2).replace(/\.00$/, '') + 'T';
    if (abs >= 1e9) return (n / 1e9).toFixed(2).replace(/\.00$/, '') + 'B';
    if (abs >= 1e6) return (n / 1e6).toFixed(2).replace(/\.00$/, '') + 'M';
    return n.toLocaleString();
  }

  function fmt(val, digits = 2) {
    if (val === null || val === undefined || !isFinite(val)) return '—';
    const num = Number(val);
    if (!isFinite(num)) return '—';
    return num.toFixed(digits);
  }

  function renderMQCards(items, fallbackUsed = false) {
    const grid = document.createElement('div');
    grid.className = 'mq-grid';

    if (items.length === 0) {
      mqDataDiv.innerHTML = `<div class="mq-grid"><div class="mq-card"><p>No recent Magic Quadrant announcements found.</p></div></div>`;
      return;
    }

    items.forEach(it => {
      const card = document.createElement('div');
      card.className = 'mq-card';

      const dateStr = it.pubDate ? new Date(it.pubDate).toLocaleDateString() : '';

      const fundamentals = it.fundamentals || {};
      const marketCapStr = fundamentals.marketCap ? humanMarketCap(fundamentals.marketCap) : '—';
      const priceStr = fundamentals.price ? `$${fmt(fundamentals.price, 2)}` : '—';
      const peStr = fundamentals.pe ? fmt(fundamentals.pe, 2) : '—';

      card.innerHTML = `
        <h3>${it.vendor}</h3>
        <p><strong>Category:</strong> ${it.categoryGuess || 'Magic Quadrant'}</p>
        <p><strong>Post:</strong> <a href="${it.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(it.title)}</a></p>
        <p><strong>Date:</strong> ${dateStr}</p>
        <hr style="border:none;border-top:1px solid ${document.body.classList.contains('dark-mode') ? '#555' : '#eee'};margin:8px 0;">
        <p><strong>Ticker:</strong> ${it.ticker || '—'}</p>
        <p><strong>Market Cap:</strong> ${marketCapStr}</p>
        <p><strong>Price:</strong> ${priceStr} &nbsp; <strong>P/E:</strong> ${peStr}</p>
      `;
      grid.appendChild(card);
    });

    mqDataDiv.innerHTML = '';
    mqDataDiv.appendChild(grid);

    if (fallbackUsed) {
      const note = document.createElement('p');
      note.style.fontSize = '0.85rem';
      note.style.marginTop = '8px';
      note.textContent = 'No recent public posts matched; showing examples.';
      mqDataDiv.appendChild(note);
    }
  }

  function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // Load on startup and every 6 hours
  loadMagicQuadrant(false);
  setInterval(() => loadMagicQuadrant(true), MQ_CACHE_MS);
});

