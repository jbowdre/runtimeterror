// adapted from https://aaronluna.dev/blog/add-copy-button-to-code-blocks-hugo-chroma/

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
  // Need to get just the last-child of each .line element to avoid copying the line numbers
  const nodeListToCopy = highlightDiv.querySelectorAll(":last-child > .chroma > code > .line > :last-child");
  // Reduce the nodeList to a string of text with each line separated by a newline
  const codeToCopy = Array.from(nodeListToCopy).reduce((accumulator, line) => accumulator + line.innerText, "");
  try {
    var result = await navigator.permissions.query({ name: "clipboard-write" });
    if (result.state == "granted" || result.state == "prompt") {
      await navigator.clipboard.writeText(codeToCopy);
    } else {
      copyCodeBlockExecCommand(codeToCopy, highlightDiv);
    }
  } catch (_) {
    copyCodeBlockExecCommand(codeToCopy, highlightDiv);
  } finally {
 button.blur();
  button.innerText = "Copied!";
  setTimeout(function () {
    button.innerText = "Copy";
  }, 2000);  }
}

function copyCodeBlockExecCommand(codeToCopy, highlightDiv) {
  console.log("We shouldn't get here...");
  const textArea = document.createElement("textArea");
  textArea.contentEditable = "true";
  textArea.readOnly = "false";
  textArea.className = "copyable-text-area";
  textArea.value = codeToCopy;
  highlightDiv.insertBefore(textArea, highlightDiv.firstChild);
  const range = document.createRange();
  range.selectNodeContents(textArea);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  textArea.setSelectionRange(0, 999999);
  document.execCommand("copy");
  highlightDiv.removeChild(textArea);
}
