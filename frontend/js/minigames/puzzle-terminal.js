import { audioManager } from "../audio/audio-manager.js";

const TRAVERSE_SECONDS_BY_STAGE = [1.5, 1.25, 1, 0.75];
const TARGET_WIDTH_RATIO = 0.14;
const AUTO_CLOSE_DELAY_MS = 550;

export function createPuzzleTerminal({ root, requiredSuccesses = 4, onComplete, onClose }) {
  const node = document.createElement("div");
  node.className = "puzzle-terminal";
  node.setAttribute("role", "dialog");
  node.setAttribute("aria-modal", "true");
  node.setAttribute("aria-label", "컴퓨터 잠금 해제 퍼즐");
  node.innerHTML = `
    <div class="puzzle-terminal__frame">
      <button type="button" class="puzzle-terminal__close" data-action="close" data-sound="window_close" aria-label="퍼즐 닫기">×</button>
      <div class="puzzle-terminal__screen">
        <p class="puzzle-terminal__count">0 / ${requiredSuccesses}</p>
        <div class="puzzle-terminal__track-wrap">
          <div class="puzzle-terminal__arrow">▼</div>
          <div class="puzzle-terminal__track">
            <div class="puzzle-terminal__target"></div>
          </div>
        </div>
        <p class="puzzle-terminal__hint">SPACE로 타이밍 맞추기</p>
      </div>
    </div>
  `;
  root.appendChild(node);

  const countLabel = node.querySelector(".puzzle-terminal__count");
  const arrowEl = node.querySelector(".puzzle-terminal__arrow");
  const targetEl = node.querySelector(".puzzle-terminal__target");
  const screenEl = node.querySelector(".puzzle-terminal__screen");
  const closeButton = node.querySelector(".puzzle-terminal__close");

  let successCount = 0;
  let progress = 0;
  let direction = 1;
  let targetStart = 0;
  let traverseSeconds = TRAVERSE_SECONDS_BY_STAGE[0];
  let lastTimestamp = null;
  let frameId = null;
  let finished = false;
  let inputLocked = false;

  function updateCount() {
    countLabel.textContent = `${successCount} / ${requiredSuccesses}`;
  }

  function startRound() {
    targetStart = Math.random() * (1 - TARGET_WIDTH_RATIO);
    targetEl.style.left = `${targetStart * 100}%`;
    targetEl.style.width = `${TARGET_WIDTH_RATIO * 100}%`;
    traverseSeconds = TRAVERSE_SECONDS_BY_STAGE[
      Math.min(successCount, TRAVERSE_SECONDS_BY_STAGE.length - 1)
    ];
    progress = 0;
    direction = 1;
    inputLocked = false;
  }

  function flashResult(success) {
    screenEl.classList.remove("puzzle-terminal__screen--hit", "puzzle-terminal__screen--miss");
    // eslint-disable-next-line no-unused-expressions
    screenEl.offsetWidth;
    screenEl.classList.add(success ? "puzzle-terminal__screen--hit" : "puzzle-terminal__screen--miss");
  }

  function cleanup() {
    window.removeEventListener("keydown", handleKeyDown);
    node.removeEventListener("click", handleClick);
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
    node.remove();
  }

  function finish(success) {
    if (finished) {
      return;
    }

    finished = true;
    cleanup();
    if (success) {
      onComplete?.();
    } else {
      onClose?.();
    }
  }

  function handleKeyDown(event) {
    if (finished || inputLocked) {
      return;
    }

    if (event.code === "Escape") {
      event.preventDefault();
      finish(false);
      return;
    }

    if (event.code !== "Space") {
      return;
    }

    event.preventDefault();
    inputLocked = true;
    const hit = progress >= targetStart && progress <= targetStart + TARGET_WIDTH_RATIO;

    if (hit) {
      successCount += 1;
      audioManager.playSfx("qte_success");
      flashResult(true);
    } else {
      successCount = 0;
      audioManager.playSfx("qte_fail");
      flashResult(false);
    }
    updateCount();

    if (successCount >= requiredSuccesses) {
      audioManager.playSfx("machine_cogs");
      window.setTimeout(() => finish(true), AUTO_CLOSE_DELAY_MS);
      return;
    }

    window.setTimeout(startRound, AUTO_CLOSE_DELAY_MS);
  }

  function handleClick(event) {
    if (event.target.closest("[data-action='close']")) {
      finish(false);
    }
  }

  function tick(timestamp) {
    if (lastTimestamp === null) {
      lastTimestamp = timestamp;
    }
    const deltaSeconds = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    if (!inputLocked) {
      progress += (direction * deltaSeconds) / traverseSeconds;
      if (progress >= 1) {
        progress = 1;
        direction = -1;
      } else if (progress <= 0) {
        progress = 0;
        direction = 1;
      }
    }

    arrowEl.style.left = `${progress * 100}%`;
    frameId = requestAnimationFrame(tick);
  }

  node.addEventListener("click", handleClick);
  window.addEventListener("keydown", handleKeyDown);
  closeButton.focus();
  audioManager.playSfx("qte_start");
  startRound();
  frameId = requestAnimationFrame(tick);

  function destroy() {
    if (finished) {
      return;
    }

    finished = true;
    cleanup();
  }

  return { node, destroy };
}
