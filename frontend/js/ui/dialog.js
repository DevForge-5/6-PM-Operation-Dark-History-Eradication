export function createDialogBox({ root }) {
  const node = document.createElement("div");
  node.className = "dialog-box";
  root.appendChild(node);
  let advanceHandler = null;

  function handleClick() {
    advanceHandler?.();
  }

  function handleKeyDown(event) {
    if (event.code !== "Space" || event.repeat || !advanceHandler) {
      return;
    }

    event.preventDefault();
    advanceHandler();
  }

  root.addEventListener("click", handleClick);
  window.addEventListener("keydown", handleKeyDown);

  function show(text) {
    node.textContent = text;
  }

  function setAdvanceHandler(handler) {
    advanceHandler = handler;
  }

  function destroy() {
    root.removeEventListener("click", handleClick);
    window.removeEventListener("keydown", handleKeyDown);
    advanceHandler = null;
    node.remove();
  }

  return { node, show, setAdvanceHandler, destroy };
}
