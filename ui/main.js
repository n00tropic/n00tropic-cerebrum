const form = document.getElementById("upload-form");
const logEl = document.getElementById("log");

function log(text) {
  logEl.textContent = text;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById("file");
  const dataset = document.getElementById("dataset").value.trim();
  if (!fileInput.files.length) {
    log("Select a PDF first.");
    return;
  }
  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append("pdf", file);
  if (dataset) formData.append("dataset", dataset);
  log("Uploading and processing…");
  try {
    const res = await fetch("/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || res.statusText);
    }
    log(JSON.stringify(data, null, 2));
  } catch (err) {
    log(`Error: ${err.message}`);
  }
});
