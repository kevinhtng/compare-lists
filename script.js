document.addEventListener('DOMContentLoaded', () => {
  const followingFileInput = document.getElementById('followingFileInput');
  const followersFileInput = document.getElementById('followersFileInput');
  const followingFileName = document.getElementById('followingFileName');
  const followersFileName = document.getElementById('followersFileName');
  const compareBtn = document.getElementById('compareBtn');
  const clearBtn = document.getElementById('clearBtn');
  const resultDiv = document.getElementById('result');
  const timestampDiv = document.getElementById('timestamp');
  const listAInput = document.getElementById('listA');
  const listBInput = document.getElementById('listB');
  const darkModeCheckbox = document.getElementById('darkModeCheckbox');
  const newsList = document.getElementById('newsList');
  const mqDataDiv = document.getElementById('mqData');

  /* =========================
     Dark Mode Toggle
  ========================== */
  darkModeCheckbox.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode', darkModeCheckbox.checked);
  });

  /* =========================
     Instagram JSON Upload
     (following.json -> List A, followers.json -> List B,
      handled as two independent inputs so both can be loaded)
  ========================== */
  function wireJsonUpload(fileInput, fileNameEl, targetTextarea) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      fileNameEl.textContent = file.name;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target.result);
          const usernames = extractInstagramUsernames(json);
          if (usernames.length === 0) {
            alert('No usernames found in that file. Make sure it\'s an Instagram followers/following export.');
            return;
          }
          targetTextarea.value = usernames.join('\n');
        } catch (err) {
          alert('Invalid JSON file.');
        }
      };
      reader.readAsText(file);
    });
  }

  function extractInstagramUsernames(json) {
    const names = new Set();
    function search(obj) {
      if (Array.isArray(obj)) {
        obj.forEach(search);
        return;
      }
      if (typeof obj !== 'object' || obj === null) return;

      // Newer Instagram export format: { title: "username", string_list_data: [...] }
      if (typeof obj.title === 'string' && Array.isArray(obj.string_list_data)) {
        names.add(obj.title);
      }

      // Older Instagram export format: string_list_data items carry "value"
      if (Array.isArray(obj.string_list_data)) {
        obj.string_list_data.forEach(item => {
          if (item && typeof item.value === 'string') names.add(item.value);
        });
      }

      Object.values(obj).forEach(search);
    }
    search(json);
    return [...names];
  }

  wireJsonUpload(followingFileInput, followingFileName, listAInput);
  wireJsonUpload(followersFileInput, followersFileName, listBInput);

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
    html += `<div class="result-heading only-a">Not following back (${onlyA.length})</div>${onlyA.join(', ') || 'Everyone you follow, follows you back.'}<br>`;
    html += `<div class="result-heading only-b">Fans you don't follow (${onlyB.length})</div>${onlyB.join(', ') || 'None'}<br>`;
    html += `<div class="result-heading both">Mutual (${inBoth.length})</div>${inBoth.join(', ') || 'None'}`;

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
    followingFileInput.value = '';
    followersFileInput.value = '';
    followingFileName.textContent = 'No file selected';
    followersFileName.textContent = 'No file selected';
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
     Gartner Magic Quadrant "Leaders"
  ====================================================== */

  const MQ_FEEDS = [
    { vendor: 'Amazon (AWS)', ticker: 'AMZN', url: 'https://aws.amazon.com/blogs/aws/feed/' },
    { vendor: 'Microsoft Azure', ticker: 'MSFT', url: 'https://azure.microsoft.com/en-us/blog/feed/' },
    { vendor: 'Google Cloud', ticker: 'GOOGL', url: 'https://cloudblog.withgoogle.com/rss/' },
    { vendor: 'Salesforce', ticker: 'CRM', url: null } // example CRM
  ];

  const MQ_CACHE_KEY = 'mq_leaders_cache_v3';
  const MQ_CACHE_MS = 6 * 60 * 60 * 1000; // 6 hours
  const MQ_YEAR_PREFERENCE = 2025;

  // Inject Refresh button
  (function injectRefreshButton() {
    const wrapper = document.getElementById('mq-dashboard');
    if (!wrapper) return;
    const btn = document.createElement('button');
    btn.id = 'mqRefreshBtn';
    btn.textContent = 'Refresh Leaders';
    btn.style.marginBottom = '14px';
    btn.addEventListener('click', () => loadMagicQuadrant(true));
    const h2 = wrapper.querySelector('h2');
    if (h2 && !wrapper.querySelector('#mqRefreshBtn')) h2.insertAdjacentElement('afterend', btn);
  })();

  async function loadMagicQuadrant(force = false) {
    try {
      if (!force) {
        const cached = JSON.parse(localStorage.getItem(MQ_CACHE_KEY) || 'null');
        if (cached && (Date.now() - cached.savedAt) < MQ_CACHE_MS) {
          renderMQCards(cached.items, cached.fallbackUsed);
          return;
        }
      }

      mqDataDiv.innerHTML = `<div class="mq-grid"><div class="mq-card"><p>Loading Magic Quadrant updates…</p></div></div>`;

      let items = await scanFeedsForMagicQuadrant();

      if (items.length === 0) {
        items = [
          { vendor: 'Microsoft', title: 'Sample: Leader in Analytics & BI Platforms', link: '#', pubDate: new Date().toISOString(), categoryGuess: 'Analytics & BI Platforms', ticker: 'MSFT' },
          { vendor: 'Amazon (AWS)', title: 'Sample: Leader in Cloud Infrastructure & Platform Services', link: '#', pubDate: new Date().toISOString(), categoryGuess: 'Cloud Infrastructure', ticker: 'AMZN' },
          { vendor: 'Google Cloud', title: 'Sample: Leader in Cloud AI Developer Services', link: '#', pubDate: new Date().toISOString(), categoryGuess: 'Cloud AI Developer Services', ticker: 'GOOGL' }
        ];
      }

      await enrichWithFundamentals(items);

      localStorage.setItem(MQ_CACHE_KEY, JSON.stringify({ items, savedAt: Date.now(), fallbackUsed: items.length <= 3 }));

      renderMQCards(items, items.length <= 3);
    } catch {
      mqDataDiv.innerHTML = `<div class="mq-grid"><div class="mq-card"><p>Could not load Magic Quadrant updates.</p></div></div>`;
    }
  }

  function buildRssProxyUrl(feedUrl) {
    return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
  }

  function extractCategoryFromTitle(title) {
    const m = title.match(/Magic Quadrant(?:\s*for)?\s*([^:\-\–\|]+)?/i);
    return m && m[1] ? m[1].trim() : 'Magic Quadrant';
  }

  function isMagicQuadrantHit(item) {
    const t = `${item.title || ''} ${item.description || ''}`.toLowerCase();
    return t.includes('gartner') && t.includes('magic quadrant');
  }

  function withinYearPreference(dateStr) {
    const y = new Date(dateStr).getFullYear();
    return y === MQ_YEAR_PREFERENCE;
  }

  async function scanFeedsForMagicQuadrant() {
    const results = [];
    const tasks = MQ_FEEDS.map(async ({ vendor, ticker, url }) => {
      if (!url) return;
      try {
        const res = await fetch(buildRssProxyUrl(url));
        const data = await res.json();
        (data.items || []).slice(0, 2).forEach(it => {
          if (isMagicQuadrantHit(it) && withinYearPreference(it.pubDate)) {
            results.push({
              vendor,
              title: it.title,
              link: it.link,
              pubDate: it.pubDate,
              categoryGuess: extractCategoryFromTitle(it.title),
              ticker
            });
          }
        });
      } catch {}
    });

    await Promise.all(tasks);
    return results;
  }

  async function enrichWithFundamentals(items) {
    const tickers = [...new Set(items.map(i => i.ticker).filter(Boolean))];
    if (!tickers.length) return;

    for (const tk of tickers) {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tk}`);
        const data = await res.json();
        const q = data?.quoteResponse?.result?.[0];
        if (!q) continue;
        items.forEach(it => {
          if (it.ticker === tk) it.fundamentals = { price: q.regularMarketPrice, marketCap: q.marketCap, pe: q.trailingPE };
        });
      } catch {}
    }
  }

  function humanMarketCap(n) {
    if (!n || !isFinite(n)) return '—';
    const abs = Math.abs(n);
    if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    return n.toLocaleString();
  }

  function fmt(val, digits = 2) {
    if (!val || !isFinite(val)) return '—';
    return Number(val).toFixed(digits);
  }

  function renderMQCards(items, fallbackUsed = false) {
    const grid = document.createElement('div');
    grid.className = 'mq-grid';

    if (!items.length) {
      mqDataDiv.innerHTML = `<div class="mq-grid"><div class="mq-card"><p>No recent MQ announcements found.</p></div></div>`;
      return;
    }

    items.forEach(it => {
      const card = document.createElement('div');
      card.className = 'mq-card';
      const dateStr = it.pubDate ? new Date(it.pubDate).toLocaleDateString() : '';
      const f = it.fundamentals || {};
      card.innerHTML = `
        <h3>${it.vendor}</h3>
        <p><strong>Category:</strong> ${it.categoryGuess}</p>
        <p><strong>Post:</strong> <a href="${it.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(it.title)}</a></p>
        <p><strong>Date:</strong> ${dateStr}</p>
        <p><strong>Ticker:</strong> ${it.ticker || '—'}</p>
        <p><strong>Market Cap:</strong> ${humanMarketCap(f.marketCap)}</p>
        <p><strong>Price:</strong> ${f.price ? `$${fmt(f.price)}` : '—'} &nbsp; <strong>P/E:</strong> ${f.pe ? fmt(f.pe) : '—'}</p>
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
    return (s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  // Initial load & 6-hour interval
  loadMagicQuadrant(false);
  setInterval(() => loadMagicQuadrant(true), MQ_CACHE_MS);
});
