import { formatClock } from "../game/game-state.js";

export function createHud({ root, stats }) {
  const node = document.createElement("div");
  node.className = "hud";
  node.innerHTML = `
    <div class="hud__stat hud__stat--hp">
      <span class="hud__label">HP</span>
      <div class="hud__bar"><div class="hud__bar-fill hud__bar-fill--hp"></div></div>
    </div>
    <div class="hud__clock"></div>
    <div class="hud__stat hud__stat--cringe">
      <span class="hud__label">CRINGE</span>
      <div class="hud__bar"><div class="hud__bar-fill hud__bar-fill--cringe"></div></div>
    </div>
  `;
  root.appendChild(node);

  const hpFill = node.querySelector(".hud__bar-fill--hp");
  const cringeFill = node.querySelector(".hud__bar-fill--cringe");
  const clock = node.querySelector(".hud__clock");

  function update(currentStats) {
    hpFill.style.width = `${(currentStats.hp / currentStats.hpMax) * 100}%`;
    cringeFill.style.width = `${(currentStats.cringe / currentStats.cringeMax) * 100}%`;
    clock.textContent = formatClock(currentStats);
  }

  update(stats);

  function destroy() {
    node.remove();
  }

  return { node, update, destroy };
}
