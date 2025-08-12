// contentScript.js
(function () {
  function textOf(node) {
    if (!node) return "";
    return node.textContent.replace(/\s+/g, " ").trim();
  }

  function findLabel(element) {
    if (!element) return "";

    const id = element.id;
    if (id) {
      const forLabel = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (forLabel) return textOf(forLabel);
    }

    const ancestorLabel = element.closest("label");
    if (ancestorLabel) return textOf(ancestorLabel);

    let prev = element.previousElementSibling;
    let attempts = 0;
    while (prev && attempts < 4) {
      if (prev.tagName && prev.tagName.toLowerCase() === "label")
        return textOf(prev);
      if (["div", "span", "p", "strong"].includes(prev.tagName.toLowerCase())) {
        const t = textOf(prev);
        if (t) return t;
      }
      prev = prev.previousElementSibling;
      attempts++;
    }

    const aria =
      element.getAttribute &&
      (element.getAttribute("aria-label") || element.getAttribute("title"));
    if (aria) return aria.trim();

    if (element.placeholder) return element.placeholder.trim();

    return "";
  }

  function collectFields(form) {
    const fields = [];
    const selector = "input, textarea, select, button";
    const controls = Array.from(form.querySelectorAll(selector));
    controls.forEach((el) => {
      if (
        el.tagName.toLowerCase() === "input" &&
        el.type &&
        el.type.toLowerCase() === "hidden"
      )
        return;

      const field = {
        tag: el.tagName.toLowerCase(),
        type: el.type || null,
        id: el.id || null,
        name: el.name || null,
        placeholder: el.placeholder || null,
        label: findLabel(el) || null,
        required: el.required || false,
        value: el.value !== undefined ? el.value : null,
      };
      fields.push(field);
    });

    return fields;
  }

  // Build array of form objects
  function getFormsData() {
    const forms = Array.from(document.querySelectorAll("form"));
    const result = forms.map((form, idx) => {
      const action = form.getAttribute("action");
      const method = form.getAttribute("method") || "get";
      return {
        index: idx,
        action,
        method: method.toLowerCase(),
        id: form.id || null,
        name: form.name || null,
        fields: collectFields(form),
      };
    });

    if (result.length === 0) {
      const pseudoFields = collectFields(document);
      if (pseudoFields.length) {
        result.push({
          index: 0,
          action: null,
          method: null,
          id: null,
          name: null,
          fields: pseudoFields,
          note: "No <form> elements found — scanned entire document.",
        });
      }
    }
  }

  window.__FORM_SCANNER_RESULT = result;

  console.clear();
  console.log(
    "%c[Form Scanner] Found forms:",
    "color: green; font-weight: bold;"
  );
  console.log(result);

  // Expose a message-based API so popup can ask for data
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.action === "GET_FORMS") {
      try {
        const data = getFormsData();
        // sendResponse can be synchronous
        sendResponse({ success: true, data });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      // indicate we'll respond synchronously
      return true;
    }
  });

  // Optionally run at load to cache result (not required)
  // window.__FORM_SCANNER_RESULT = getFormsData();
})();
