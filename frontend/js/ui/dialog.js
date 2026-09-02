// Ignore Space for a beat after mount: a QTE mash's trailing keydowns can
// otherwise land on this dialog the instant it appears (its overlay removes
// itself and this box mounts within the same key-mash burst) and skip the
// result text before the player ever sees it. Click isn't affected — only
// this listener is fed by the leftover key-repeat.
const INPUT_GUARD_MS = 250;

export function createDialogBox({ root }) {
  const node = document.createElement("div");
  node.className = "dialog-box";
  root.appendChild(node);
  let advanceHandler = null;
  const readyAt = performance.now() + INPUT_GUARD_MS;

  function handleClick() {
    advanceHandler?.();
  }

  function handleKeyDown(event) {
    if (event.code !== "Space" || event.repeat || !advanceHandler) {
      return;
    }

    if (performance.now() < readyAt) {
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
