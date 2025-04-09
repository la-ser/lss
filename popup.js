let editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
  mode: "css",
  lineNumbers: true,
});

chrome.storage.sync.get("customStyle", function (data) {
  if (data.customStyle) {
    editor.setValue(data.customStyle);
  }
});

chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === "sync" && changes.customStyle) {
    editor.setValue(changes.customStyle.newValue);
  }
});

document.getElementById("saveBtn").addEventListener("click", function () {
  let newStyle = editor.getValue();
  chrome.storage.sync.set({ customStyle: newStyle }, function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.scripting.insertCSS({
        target: { tabId: tabs[0].id },
        css: newStyle,
      });
    });
    alert("Style saved and applied! Reload the page to ensure changes persist.");
  });
});

document.getElementById("enableSelectMode").addEventListener("click", function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: "enableSelectMode" });
  });
});

document.getElementById("expandBtn").addEventListener("click", function () {
  chrome.windows.create({
    url: chrome.runtime.getURL("window.html"),
    type: "popup",
    width: 800,
    height: 600,
  });
});

fetch("https://github.com/la-ser/lss/blob/main/manifest.json")
  .then((res) => res.json())
  .then((remoteManifest) => {
    chrome.runtime.getManifest().version; // current version
    if (remoteManifest.version !== chrome.runtime.getManifest().version) {
      alert("Update available! Please download the new version from GitHub.");
    }
  });
