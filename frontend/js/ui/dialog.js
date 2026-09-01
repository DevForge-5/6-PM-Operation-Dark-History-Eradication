export function createDialogBox({ root }) {
  const node = document.createElement("div");
  node.className = "dialog-box";
  root.appendChild(node);

  function show(text) {
    node.textContent = text;
  }

  function destroy() {
    node.remove();
  }

  return { node, show, destroy };
}
