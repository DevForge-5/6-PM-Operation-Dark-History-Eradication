import { formatClock } from "../game/game-state.js";

export function createResultScreen({ root, ending, stats, onRestart }) {
  const node = document.createElement("div");
  node.className = "result-screen";
  node.innerHTML = `
    <p class="result-screen__type">[${ending.type}]</p>
    <h2 class="result-screen__title">${ending.title}</h2>
    <p class="result-screen__description">${ending.description}</p>
    <dl class="result-screen__stats">
      <div><dt>클리어 시각</dt><dd>${formatClock(stats)}</dd></div>
      <div><dt>HP</dt><dd>${stats.hp} / ${stats.hpMax}</dd></div>
      <div><dt>Cringe</dt><dd>${stats.cringe} / ${stats.cringeMax}</dd></div>
    </dl>
    <button type="button" class="result-screen__restart" data-action="restart">처음으로</button>
  `;
  root.appendChild(node);

  function handleClick(event) {
    if (event.target.closest("[data-action='restart']")) {
      onRestart();
    }
  }
  node.addEventListener("click", handleClick);

  function destroy() {
    node.removeEventListener("click", handleClick);
    node.remove();
  }

  return { node, destroy };
}
