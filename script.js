document.addEventListener('DOMContentLoaded', () => {
  const igCheckbox = document.getElementById('instagramCheckbox');
  const igFileInput = document.getElementById('igFile');
  const compareBtn = document.getElementById('compareBtn');
  const resultDiv = document.getElementById('result');

  let igUsernames = [];

  // Auto-enable Instagram checkbox if file detected
  igFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.toLowerCase().includes('followers')) {
      igCheckbox.checked = true;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        igUsernames = extractInstagramUsernames(json);
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  });

  compareBtn.addEventListener('click', () => {
    let listA = document.getElementById('listA').value.split(/\s+/).filter(Boolean);
    let listB = document.getElementById('listB').value.split(/\s+/).filter(Boolean);

    if (igCheckbox.checked && igUsernames.length > 0) {
      listA = igUsernames; // Replace List A with Instagram followers
    }

    const onlyA = listA.filter(x => !listB.includes(x));
    const onlyB = listB.filter(x => !listA.includes(x));

    let output = '';
    if (onlyA.length) {
      output += 'In A but not B:\n' + onlyA.join('\n') + '\n\n';
    }
    if (onlyB.length) {
      output += 'In B but not A:\n' + onlyB.join('\n') + '\n';
    }
    if (!output) {
      output = 'Both lists match perfectly!';
    }

    resultDiv.textContent = output;
  });

  function extractInstagramUsernames(json) {
    // Instagram follower JSON usually has "string_list_data" entries
    const names = [];
    function search(obj) {
      if (Array.isArray(obj)) {
        obj.forEach(search);
      } else if (typeof obj === 'object' && obj !== null) {
        if (obj.value) names.push(obj.value);
        Object.values(obj).forEach(search);
      }
    }
    search(json);
    return names;
  }
});
