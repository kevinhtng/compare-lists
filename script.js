// compare-lists main script
document.getElementById("compareBtn").addEventListener("click", () => {
  const listA = document.getElementById("listA").value.split("\n").map(item => item.trim()).filter(Boolean);
  const listB = document.getElementById("listB").value.split("\n").map(item => item.trim()).filter(Boolean);
  
  const ignoreCase = document.getElementById("ignoreCase").checked;
  const removeDuplicates = document.getElementById("removeDuplicates").checked;
  
  const normalize = str => ignoreCase ? str.toLowerCase() : str;
  
  let aItems = listA.map(normalize);
  let bItems = listB.map(normalize);
  
  if (removeDuplicates) {
    aItems = [...new Set(aItems)];
    bItems = [...new Set(bItems)];
  }

  const setA = new Set(aItems);
  const setB = new Set(bItems);

  const onlyA = [...setA].filter(x => !setB.has(x));
  const onlyB = [...setB].filter(x => !setA.has(x));
  const inBoth = [...setA].filter(x => setB.has(x));

  document.getElementById("onlyA").textContent = onlyA.join("\n");
  document.getElementById("onlyB").textContent = onlyB.join("\n");
  document.getElementById("inBoth").textContent = inBoth.join("\n");
});
