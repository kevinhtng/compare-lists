document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInput");
  const igModeCheckbox = document.getElementById("igMode");
  const compareBtn = document.getElementById("compareBtn");
  const resultsDiv = document.getElementById("results");

  fileInput.addEventListener("change", handleFileUpload);
  compareBtn.addEventListener("click", compareLists);

  function handleFileUpload() {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        const usernames = extractInstagramUsernames(data);

        if (usernames.length > 0) {
          igModeCheckbox.checked = true; // auto-enable
          document.getElementById("listA").value = usernames.join("\n");
        }
      } catch (err) {
        alert("Invalid JSON file. Please select a valid Instagram data export.");
      }
    };
    reader.readAsText(file);
  }

  function extractInstagramUsernames(data) {
    // Detect if it's IG data and return usernames
    let usernames = [];
    if (data && data.relationships_following) {
      usernames = data.relationships_following.map(item => item.string_list_data[0].value);
    } else if (Array.isArray(data)) {
      usernames = data.map(item => item.string_list_data?.[0]?.value).filter(Boolean);
    }
    return usernames;
  }

  function compareLists() {
    const listA = document.getElementById("listA").value.trim().split(/\s+/);
    const listB = document.getElementById("listB").value.trim().split(/\s+/);

    const setA = new Set(listA);
    const setB = new Set(listB);

    const onlyInA = listA.filter(x => !setB.has(x));
    const onlyInB = listB.filter(x => !setA.has(x));

    resultsDiv.innerHTML = `
      <h3>Results</h3>
      <p><strong>Only in List A:</strong><br>${onlyInA.join(", ") || "None"}</p>
      <p><strong>Only in List B:</strong><br>${onlyInB.join(", ") || "None"}</p>
    `;
  }
});
