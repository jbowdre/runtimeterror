// adapted from https://digitaldrummerj.me/hugo-add-copy-code-snippet-button/

function createCopyButton(highlightDiv) {
  const button = document.createElement("button");
  button.className = "copy-code-button";
  button.type = "button";
  button.innerText = "Copy";
  button.addEventListener("click", () => copyCodeToClipboard(button, highlightDiv));
  highlightDiv.insertBefore(button, highlightDiv.firstChild);
  const wrapper = document.createElement("div");
  wrapper.className = "highlight-wrapper";
  highlightDiv.parentNode.insertBefore(wrapper, highlightDiv);
  wrapper.appendChild(highlightDiv);
}

document.querySelectorAll(".highlight").forEach((highlightDiv) => createCopyButton(highlightDiv));

async function copyCodeToClipboard(button, highlightDiv) {
  // capture all code lines in the selected block which aren't classed `nocopy` or `line-remove`
  let codeToCopy = highlightDiv.querySelectorAll(":last-child > .torchlight > code > .line:not(.nocopy, .line-remove)");
  // now remove the first-child of each line with class `line-number`
  codeToCopy = Array.from(codeToCopy).reduce((accumulator, line) => {
    if (line.firstChild.className != "line-number") {
      return accumulator + line.innerText + "\n"; }
    else {
      return accumulator + Array.from(line.children).filter(
        (child) => child.className != "line-number").reduce(
          (accumulator, child) => accumulator + child.innerText, "") + "\n";
    }
  }, "");
  try {
    var result = await navigator.permissions.query({ name: "clipboard-write" });
    if (result.state == "granted" || result.state == "prompt") {
      await navigator.clipboard.writeText(codeToCopy);
    } else {
      button.blur();
      button.innerText = "Error!";
      setTimeout(function () {
        button.innerText = "Copy";
      }, 2000);
    }
  } catch (_) {
    button.blur();
    button.innerText = "Error!";
    setTimeout(function () {
      button.innerText = "Copy";
    }, 2000);
  } finally {
    button.blur();
    button.innerText = "Copied!";
    setTimeout(function () {
      button.innerText = "Copy";
    }, 2000);
  }
}

