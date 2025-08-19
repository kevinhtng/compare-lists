document.addEventListener('DOMContentLoaded', () => {
  const igCheckbox = document.getElementById('instagramCheckbox');
  const igFileInput = document.getElementById('igFile');
  const compareBtn = document.getElementById('compareBtn');
  const resultDiv = document.getElementById('result');

  let igUsernames = [];

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
        document.getElementById('listA').value = igUsernames.join('\n');
      } catch (err) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  });

  compareBtn.addEventListener('click', () => {
    const listAraw = document.getElementById('listA').value.split(/\s+/).filter(Boolean);
    const listBraw = document.getElementById('listB').value.split(/\s+/).filter(Boolean);

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
});

