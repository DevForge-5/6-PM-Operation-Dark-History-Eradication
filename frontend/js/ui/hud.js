import { formatClock } from "../game/game-state.js";

export function createHud({ root, stats }) {
  const node = document.createElement("div");
  node.className = "hud";
  node.innerHTML = `
    <div class="hud__meters">
      <div class="hud__stat hud__stat--hp" role="meter" aria-label="HP">
        <img class="hud__stat-image" src="./assets/images/HPStatus.png" alt="" aria-hidden="true">
        <span class="hud__bar-empty" aria-hidden="true"></span>
      </div>
      <div class="hud__stat hud__stat--cringe" role="meter" aria-label="흑역사 수치">
        <img class="hud__stat-image" src="./assets/images/항마력창 1.png" alt="" aria-hidden="true">
        <span class="hud__bar-empty" aria-hidden="true"></span>
      </div>
    </div>
    <div class="hud__clock"></div>
  `;
  root.appendChild(node);

  const hpMeter = node.querySelector(".hud__stat--hp");
  const cringeMeter = node.querySelector(".hud__stat--cringe");
  const clock = node.querySelector(".hud__clock");

  function update(currentStats) {
    updateMeter(hpMeter, currentStats.hp, currentStats.hpMax);
    updateMeter(cringeMeter, currentStats.cringe, currentStats.cringeMax);
    clock.textContent = formatClock(currentStats);
  }

  update(stats);

  function destroy() {
    node.remove();
  }

  return { node, update, destroy };
}

function updateMeter(meter, value, max) {
  const percentage = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  meter.style.setProperty("--empty-ratio", String(1 - percentage));
  meter.setAttribute("aria-valuemin", "0");
  meter.setAttribute("aria-valuemax", String(max));
  meter.setAttribute("aria-valuenow", String(value));
}
