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

  let igUsernames = [];

  // Dark mode toggle
  darkModeCheckbox.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode', darkModeCheckbox.checked);
  });

  // Auto-enable Instagram checkbox if IG file uploaded
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

  // Compare lists function
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
    resultDiv.scrollTop = resultDiv.scrollHeight; // auto-scroll

    timestampDiv.textContent = `Last comparison: ${new Date().toLocaleString()}`;
  }

  compareBtn.addEventListener('click', compareLists);

  // Clear lists and results
  clearBtn.addEventListener('click', () => {
    listAInput.value = '';
    listBInput.value = '';
    resultDiv.innerHTML = '';
    timestampDiv.textContent = '';
    igFileInput.value = '';
    igCheckbox.checked = false;
  });

  // Ctrl/Cmd + Enter shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      compareLists();
    }
  });

  // Extract usernames from Instagram JSON
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

  // Fetch news feed every 5 minutes
  async function fetchNews() {
    // Example: using free RSS-to-JSON API
    const feeds = [
      'https://www.marketwatch.com/rss/topstories',   // stock & market
      'https://www.investopedia.com/feedbuilder/feed/getfeed?category=Investing', // investing
      'https://www.reuters.com/technology/rss'        // tech
    ];

    newsList.innerHTML = '<li>Loading news...</li>';

    try {
      const allNews = [];
      for (const feed of feeds) {
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}`);
        const data = await response.json();
        if (data.items) {
          data.items.slice(0,5).forEach(item => {
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
        a.textContent = item.title;
        li.appendChild(a);
        newsList.appendChild(li);
      });
    } catch(err) {
      newsList.innerHTML = '<li>Unable to load news.</li>';
    }
  }

  fetchNews();
  setInterval(fetchNews, 5 * 60 * 1000); // update every 5 minutes
});
