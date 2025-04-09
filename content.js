// Apply stored custom style on page load
chrome.storage.sync.get("customStyle", function (data) {
  if (data.customStyle) {
    let styleEl = document.createElement("style");
    styleEl.id = "customStyleElement";
    styleEl.innerText = data.customStyle;
    document.head.appendChild(styleEl);
  }
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "enableSelectMode") {
    enableSelectionMode();
  }
});

// Add a style for highlighting hovered elements and tooltip styling
(function addHoverStyles() {
  const css = `
      .hover-highlight { outline: 2px solid #f00 !important; }
      .selector-tooltip {
        position: fixed;
        background: black;
        color: white;
        border: 1px solid #ccc;
        padding: 5px 10px;
        z-index: 9999;
        font-size: 12px;
        box-shadow: 2px 2px 6px rgba(0,0,0,0.2);
        pointer-events: none;
      }
      .selector-picker-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      .selector-picker {
        background: #fff;
        padding: 20px;
        border-radius: 4px;
        max-width: 90%;
        font-family: sans-serif;
      }
      .selector-option {
        padding: 8px;
        margin: 5px 0;
        border: 1px solid #ccc;
        cursor: pointer;
        border-radius: 3px;
        background: black;
        color: white;
      }
      .selector-option:hover {
        background: black;
        color: white;
      }
    `;
  let style = document.createElement("style");
  style.innerText = css;
  document.head.appendChild(style);
})();

// Enhanced selection mode with element highlighting, tooltip, and selector picker
function enableSelectionMode() {
  document.body.style.cursor = "pointer";

  let tooltipEl;

  function showTooltip(elem, x, y) {
    removeTooltip();
    let info = [];
    if (elem.id) {
      info.push("ID: " + elem.id);
    }
    if (elem.classList.length) {
      info.push("Classes: " + Array.from(elem.classList).join(", "));
    }
    if (!info.length) {
      info.push("No ID or classes");
    }
    tooltipEl = document.createElement("div");
    tooltipEl.className = "selector-tooltip";
    tooltipEl.style.top = y + 10 + "px";
    tooltipEl.style.left = x + 10 + "px";
    tooltipEl.innerText = info.join(" | ");
    document.body.appendChild(tooltipEl);
  }

  function removeTooltip() {
    if (tooltipEl) {
      tooltipEl.remove();
      tooltipEl = null;
    }
  }

  function showSelectorPicker(options, callback) {
    // Create an overlay for choosing a selector option
    let overlay = document.createElement("div");
    overlay.className = "selector-picker-overlay";
    let picker = document.createElement("div");
    picker.className = "selector-picker";
    picker.innerHTML = "<strong>Select an attribute for styling:</strong>";
    options.forEach((opt) => {
      let optionDiv = document.createElement("div");
      optionDiv.className = "selector-option";
      optionDiv.innerText = opt.value;
      optionDiv.addEventListener("click", function (e) {
        e.stopPropagation();
        callback(opt.value);
        overlay.remove();
      });
      picker.appendChild(optionDiv);
    });
    overlay.appendChild(picker);
    document.body.appendChild(overlay);
  }

  function promptAndSetStyle(selector) {
    let rule = prompt(`Enter CSS declarations for ${selector} (e.g., color: red; font-size: 20px;):`, "");
    if (rule !== null) {
      let newRule = `${selector} { ${rule} }`;
      chrome.storage.sync.get("customStyle", function (data) {
        let updatedStyle = data.customStyle ? data.customStyle + "\n" + newRule : newRule;
        chrome.storage.sync.set({ customStyle: updatedStyle }, function () {
          let styleEl = document.getElementById("customStyleElement");
          if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = "customStyleElement";
            document.head.appendChild(styleEl);
          }
          styleEl.innerText = updatedStyle;
        });
      });
    }
  }

  function clickHandler(e) {
    e.preventDefault();
    e.stopPropagation();
    removeTooltip();
    let elem = e.target;
    // Remove highlight from the element now that we clicked.
    elem.classList.remove("hover-highlight");

    // Build available selectors list from id and classes
    let availableSelectors = [];
    if (elem.id) {
      availableSelectors.push({ type: "id", value: "#" + elem.id });
    }
    if (elem.classList.length) {
      Array.from(elem.classList).forEach((cls) => {
        availableSelectors.push({ type: "class", value: "." + cls });
      });
    }

    if (availableSelectors.length === 0) {
      // Fallback to unique selector if no id/classes
      let selector = getUniqueSelector(elem);
      promptAndSetStyle(selector);
    } else {
      showSelectorPicker(availableSelectors, function (chosenSelector) {
        promptAndSetStyle(chosenSelector);
      });
    }
    cleanup();
  }

  function mouseOverHandler(e) {
    e.target.classList.add("hover-highlight");
    showTooltip(e.target, e.clientX, e.clientY);
  }

  function mouseOutHandler(e) {
    e.target.classList.remove("hover-highlight");
    removeTooltip();
  }

  function cleanup() {
    document.body.style.cursor = "default";
    document.removeEventListener("mouseover", mouseOverHandler, true);
    document.removeEventListener("mouseout", mouseOutHandler, true);
    document.removeEventListener("click", clickHandler, true);
  }

  document.addEventListener("mouseover", mouseOverHandler, true);
  document.addEventListener("mouseout", mouseOutHandler, true);
  document.addEventListener("click", clickHandler, true);
}

// Generate a unique CSS selector for an element if no id/classes exist
function getUniqueSelector(el) {
  if (el.id) {
    return "#" + el.id;
  }
  let path = [];
  while (el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.nodeName.toLowerCase();
    if (el.className) {
      selector += "." + el.className.trim().split(/\s+/).join(".");
    }
    let sibling = el;
    let nth = 1;
    while ((sibling = sibling.previousElementSibling)) {
      if (sibling.nodeName.toLowerCase() === el.nodeName.toLowerCase()) nth++;
    }
    selector += `:nth-of-type(${nth})`;
    path.unshift(selector);
    el = el.parentElement;
  }
  return path.join(" > ");
}
