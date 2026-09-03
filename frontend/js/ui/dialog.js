// Ignore Space for a beat after mount: a QTE mash's trailing keydowns can
// otherwise land on this dialog the instant it appears (its overlay removes
// itself and this box mounts within the same key-mash burst) and skip the
// result text before the player ever sees it. Click isn't affected — only
// this listener is fed by the leftover key-repeat.
const INPUT_GUARD_MS = 250;

export function createDialogBox({ root }) {
  const node = document.createElement("div");
  node.className = "dialog-box";
  const speakerNode = document.createElement("strong");
  const textNode = document.createElement("span");
  const progressNode = document.createElement("span");
  speakerNode.className = "dialog-box__speaker";
  textNode.className = "dialog-box__text";
  progressNode.className = "dialog-box__progress";
  speakerNode.hidden = true;
  progressNode.hidden = true;
  node.append(speakerNode, textNode, progressNode);
  root.appendChild(node);
  let advanceHandler = null;
  const readyAt = performance.now() + INPUT_GUARD_MS;

  function handleClick(event) {
    if (!event.target.closest(".dialog-box")) {
      return;
    }
    advanceHandler?.();
  }

  function handleKeyDown(event) {
    if (!["Space", "Enter"].includes(event.code) || event.repeat || !advanceHandler) {
      return;
    }

    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) {
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

  function show(text, { speaker, progress, playerName } = {}) {
    const resolvedName = playerName || "신이현";
    textNode.textContent = String(text ?? "").replaceAll("{playerName}", resolvedName);
    speakerNode.textContent = speaker === "player" ? resolvedName : (speaker ?? "");
    speakerNode.hidden = !speakerNode.textContent;
    progressNode.textContent = progress ?? "";
    progressNode.hidden = !progressNode.textContent;
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
