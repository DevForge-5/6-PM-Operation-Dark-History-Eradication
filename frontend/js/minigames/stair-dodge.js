import { audioManager } from "../audio/audio-manager.js";

const REQUIRED_SUCCESSES = 4;
const CROSS_SECONDS_BY_LEVEL = [2.4, 1.9, 1.5, 1.1];
const HELL_MODE_LEVEL_INDEX = REQUIRED_SUCCESSES - 1;
const CHARACTER_X_RATIO = 0.24;
const JUMP_DURATION_MS = 480;
const RETRY_DELAY_MS = 650;
const NEXT_LEVEL_DELAY_MS = 1100;
const FINISH_DELAY_MS = 900;

export function createStairDodge({ root, characterSprite, onComplete, onClose }) {
  const node = document.createElement("div");
  node.className = "puzzle-terminal stair-dodge";
  node.setAttribute("role", "dialog");
  node.setAttribute("aria-modal", "true");
  node.setAttribute("aria-label", "장애물 점프 미니게임");
  node.innerHTML = `
    <div class="puzzle-terminal__frame">
      <button type="button" class="puzzle-terminal__close" data-action="close" data-sound="window_close" aria-label="미니게임 닫기">×</button>
      <div class="puzzle-terminal__screen stair-dodge__screen">
        <p class="puzzle-terminal__count">0 / ${REQUIRED_SUCCESSES}</p>
        <div class="stair-dodge__stage">
          <div class="stair-dodge__ground"></div>
          <div class="stair-dodge__character"></div>
          <div class="stair-dodge__obstacle" hidden></div>
        </div>
        <p class="stair-dodge__taunt" hidden>헬 모드가 시작된다 😈</p>
        <div class="stair-dodge__banner" hidden></div>
      </div>
    </div>
  `;
  root.appendChild(node);

  const countLabel = node.querySelector(".puzzle-terminal__count");
  const screenEl = node.querySelector(".puzzle-terminal__screen");
  const characterEl = node.querySelector(".stair-dodge__character");
  const obstacleEl = node.querySelector(".stair-dodge__obstacle");
  const tauntEl = node.querySelector(".stair-dodge__taunt");
  const bannerEl = node.querySelector(".stair-dodge__banner");
  const closeButton = node.querySelector(".puzzle-terminal__close");

  if (characterSprite) {
    characterEl.style.backgroundImage = `url("${characterSprite}")`;
  }

  let successCount = 0;
  let crossSeconds = CROSS_SECONDS_BY_LEVEL[0];
  let obstacleProgress = 0;
  let previousCenterRatio = 0;
  let isAirborne = false;
  let resolved = false;
  let roundActive = false;
  let finished = false;
  let lastTimestamp = null;
  let frameId = null;
  let jumpTimeoutId = null;
  let advanceTimeoutId = null;

  function updateCount() {
    countLabel.textContent = `${successCount} / ${REQUIRED_SUCCESSES}`;
  }

  function obstacleCenterRatio() {
    return 1.1 - obstacleProgress * 1.2;
  }

  function startRound() {
    bannerEl.hidden = true;
    crossSeconds = CROSS_SECONDS_BY_LEVEL[Math.min(successCount, CROSS_SECONDS_BY_LEVEL.length - 1)];
    obstacleProgress = 0;
    previousCenterRatio = obstacleCenterRatio();
    isAirborne = false;
    resolved = false;
    roundActive = true;
    obstacleEl.hidden = false;
    obstacleEl.style.left = `${previousCenterRatio * 100}%`;
    characterEl.classList.remove("stair-dodge__character--jump");
    tauntEl.hidden = successCount !== HELL_MODE_LEVEL_INDEX;
  }

  function showBanner(text) {
    bannerEl.textContent = text;
    bannerEl.hidden = false;
    obstacleEl.hidden = true;
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
    if (jumpTimeoutId !== null) {
      window.clearTimeout(jumpTimeoutId);
      jumpTimeoutId = null;
    }
    if (advanceTimeoutId !== null) {
      window.clearTimeout(advanceTimeoutId);
      advanceTimeoutId = null;
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

  function handleMiss() {
    resolved = true;
    roundActive = false;
    successCount = 0;
    updateCount();
    audioManager.playSfx("qte_fail");
    flashResult(false);
    obstacleEl.hidden = true;
    advanceTimeoutId = window.setTimeout(startRound, RETRY_DELAY_MS);
  }

  function handleCleared() {
    resolved = true;
    roundActive = false;
    successCount += 1;
    updateCount();
    audioManager.playSfx("qte_success");
    flashResult(true);
    obstacleEl.hidden = true;

    if (successCount >= REQUIRED_SUCCESSES) {
      audioManager.playSfx("mission_clear");
      showBanner("CLEAR!");
      advanceTimeoutId = window.setTimeout(() => finish(true), FINISH_DELAY_MS);
      return;
    }

    advanceTimeoutId = window.setTimeout(() => {
      showBanner("NEXT LEVEL");
      advanceTimeoutId = window.setTimeout(startRound, NEXT_LEVEL_DELAY_MS);
    }, RETRY_DELAY_MS);
  }

  function handleKeyDown(event) {
    if (finished) {
      return;
    }

    if (event.code === "Escape") {
      event.preventDefault();
      finish(false);
      return;
    }

    if (event.code !== "Space" || event.repeat || !roundActive || isAirborne) {
      return;
    }

    event.preventDefault();
    isAirborne = true;
    characterEl.classList.remove("stair-dodge__character--jump");
    // eslint-disable-next-line no-unused-expressions
    characterEl.offsetWidth;
    characterEl.classList.add("stair-dodge__character--jump");
    jumpTimeoutId = window.setTimeout(() => {
      isAirborne = false;
    }, JUMP_DURATION_MS);
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

    if (roundActive && !resolved) {
      obstacleProgress = Math.min(1, obstacleProgress + deltaSeconds / crossSeconds);
      const centerRatio = obstacleCenterRatio();
      obstacleEl.style.left = `${centerRatio * 100}%`;

      // Resolve once, exactly when the obstacle's center passes the
      // character's - not the instant it enters some wider "danger" band -
      // so a jump timed anywhere before that instant still counts.
      if (previousCenterRatio >= CHARACTER_X_RATIO && centerRatio < CHARACTER_X_RATIO) {
        if (isAirborne) {
          handleCleared();
        } else {
          handleMiss();
        }
      }
      previousCenterRatio = centerRatio;
    }

    frameId = requestAnimationFrame(tick);
  }

  node.addEventListener("click", handleClick);
  window.addEventListener("keydown", handleKeyDown);
  closeButton.focus();
  audioManager.playSfx("qte_start");
  updateCount();
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
