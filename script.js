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

  // --- Magic Quadrant Leaders Dashboard ---
  function createMQDashboard() {
    const container = document.querySelector('.container');

    // Create dashboard wrapper
    const mqSection = document.createElement('div');
    mqSection.id = 'mq-dashboard';
    mqSection.innerHTML = `
      <h2>Magic Quadrant Leaders (Sample)</h2>
      <div class="mq-grid" id="mqGrid"></div>
    `;
    container.appendChild(mqSection);

    // Sample static data (can replace with API later)
    const mqLeaders = [
      { name: 'Microsoft', category: 'Cloud Infrastructure', marketCap: '$3.0T', revenue: '$245B' },
      { name: 'Amazon', category: 'Cloud Infrastructure', marketCap: '$2.0T', revenue: '$574B' },
      { name: 'Google', category: 'Data Analytics', marketCap: '$2.2T', revenue: '$307B' },
      { name: 'Salesforce', category: 'CRM', marketCap: '$300B', revenue: '$35B' },
      { name: 'ServiceNow', category: 'ITSM', marketCap: '$150B', revenue: '$8B' }
    ];

    const mqGrid = document.getElementById('mqGrid');
    mqLeaders.forEach(leader => {
      const card = document.createElement('div');
      card.className = 'mq-card';
      card.innerHTML = `
        <h3>${leader.name}</h3>
        <p><strong>Category:</strong> ${leader.category}</p>
        <p><strong>Market Cap:</strong> ${leader.marketCap}</p>
        <p><strong>Revenue:</strong> ${leader.revenue}</p>
      `;
      mqGrid.appendChild(card);
    });
  }

  createMQDashboard();
});
