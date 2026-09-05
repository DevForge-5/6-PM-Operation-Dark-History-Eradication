import { audioManager } from "../audio/audio-manager.js";

export function runQte({ root, durationSeconds = 3, targetPresses = 8, isPaused = () => false }) {
  return new Promise((resolve) => {
    audioManager.playSfx("qte_start");
    const node = document.createElement("div");
    node.className = "qte-overlay";
    node.innerHTML = `
      <p class="qte-overlay__prompt">스페이스바를 연타하세요!</p>
      <div class="qte-overlay__bar"><div class="qte-overlay__bar-fill"></div></div>
      <p class="qte-overlay__count">0 / ${targetPresses}</p>
    `;
    root.appendChild(node);

    const fill = node.querySelector(".qte-overlay__bar-fill");
    const countLabel = node.querySelector(".qte-overlay__count");

    let presses = 0;
    let elapsedSeconds = 0;
    let lastTimestamp = null;
    let finished = false;
    let frameId = null;

    function finish(success) {
      if (finished) {
        return;
      }

      finished = true;
      window.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(frameId);
      node.remove();
      audioManager.stopSfx("qte_start");
      audioManager.playSfx(success ? "qte_success" : "qte_fail");
      resolve(success);
    }

    function handleKeyDown(event) {
      if (event.code !== "Space" || finished || isPaused()) {
        return;
      }

      event.preventDefault();
      presses += 1;
      countLabel.textContent = `${presses} / ${targetPresses}`;

      if (presses >= targetPresses) {
        finish(true);
      }
    }

    function tick(timestamp) {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }

      const deltaSeconds = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;
      if (!isPaused()) {
        elapsedSeconds += deltaSeconds;
      }

      const ratio = Math.min(elapsedSeconds / durationSeconds, 1);
      fill.style.width = `${(1 - ratio) * 100}%`;

      if (ratio >= 1) {
        finish(presses >= targetPresses);
        return;
      }

      frameId = requestAnimationFrame(tick);
    }

    window.addEventListener("keydown", handleKeyDown);
    frameId = requestAnimationFrame(tick);
  });
}
