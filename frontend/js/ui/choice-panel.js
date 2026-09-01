export function createChoicePanel({ root, choices, inventory, onSelect }) {
  const node = document.createElement("div");
  node.className = "choice-panel";
  node.innerHTML = choices
    .map((choice) => {
      const locked = Boolean(choice.requiresItem) && !inventory?.has(choice.requiresItem);
      const label = locked ? `${choice.label} (미보유)` : choice.label;
      return `<button type="button" class="choice-panel__button" data-choice-id="${choice.id}"${locked ? " disabled" : ""}>${label}</button>`;
    })
    .join("");
  root.appendChild(node);

  function handleClick(event) {
    const button = event.target.closest("[data-choice-id]");
    if (!button || button.disabled) {
      return;
    }

    // Stop here: onSelect() may synchronously attach a new click listener
    // higher up (e.g. the scene root's "advance dialog" handler). Without
    // this, the still-bubbling click would immediately trigger it too.
    event.stopPropagation();

    const choice = choices.find((item) => item.id === button.dataset.choiceId);
    if (choice) {
      onSelect(choice);
    }
  }

  node.addEventListener("click", handleClick);

  function destroy() {
    node.removeEventListener("click", handleClick);
    node.remove();
  }

  return { node, destroy };
}
