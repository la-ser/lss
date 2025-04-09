fetch("https://raw.githubusercontent.com/la-ser/lss/9bec24a9c569f20f3feff58c4e6edc5d7d3ac914/test.css")
  .then((response) => response.text())
  .then((css) => {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.append(style);
  })
  .catch((err) => console.error("Failed to load CSS:", err));
