// popup.js
document.getElementById("scanBtn").addEventListener("click", async () => {
  const status = document.getElementById("status");
  const output = document.getElementById("output");
  status.textContent = "Scanning…";
  output.innerHTML = "";

  try {
    // find active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) throw new Error("No active tab found.");
    const tab = tabs[0];

    chrome.tabs.sendMessage(tab.id, { action: "GET_FORMS" }, (response) => {
      if (chrome.runtime.lastError) {
        status.textContent =
          "Error: no content script on page (or page blocked).";
        output.innerHTML = `<div class="small">Note: content scripts are not injected into Chrome Web Store, internal pages (chrome://), or cross-origin iframes.</div>`;
        return;
      }
      if (!response || !response.success) {
        status.textContent = "Failed to scan.";
        output.textContent =
          response && response.error ? response.error : "No response.";
        return;
      }

      status.textContent = `Found ${response.data.length} form(s).`;
      // pretty render
      response.data.forEach((form) => {
        const div = document.createElement("div");
        div.className = "form-block";
        const header = document.createElement("div");
        header.innerHTML = `<strong>Form #${form.index}</strong> — action: ${
          form.action || "<none>"
        } method: ${form.method || "<none>"}`;
        div.appendChild(header);

        if (!form.fields || form.fields.length === 0) {
          const none = document.createElement("div");
          none.textContent = "No fields found.";
          div.appendChild(none);
        } else {
          form.fields.forEach((f, i) => {
            const fld = document.createElement("div");
            fld.className = "field";
            fld.innerHTML = `<span class="k">${i + 1}.</span> <span>${f.tag}${
              f.type ? " (" + f.type + ")" : ""
            }</span> — <em>label:</em> ${f.label || "—"} — <em>name:</em> ${
              f.name || "—"
            } — <em>id:</em> ${f.id || "—"} ${
              f.placeholder ? "&mdash; <em>ph:</em> " + f.placeholder : ""
            }`;
            div.appendChild(fld);
          });
        }

        output.appendChild(div);
      });

      // also include raw JSON viewer (collapsible)
      const pre = document.createElement("pre");
      pre.textContent = JSON.stringify(response.data, null, 2);
      output.appendChild(pre);
    });
  } catch (err) {
    status.textContent = "Error: " + err.message;
  }
});
