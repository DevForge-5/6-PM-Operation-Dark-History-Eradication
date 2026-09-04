import { audioManager } from "../audio/audio-manager.js";

const REQUIRED_LEVELS = 4;
const OBSTACLES_PER_LEVEL = 5;
const HELL_MODE_LEVEL_INDEX = REQUIRED_LEVELS - 1;
// Like Chrome's dino run: obstacles keep coming continuously within a
// level (not one at a time with a stop after each), and both spawn rate
// and travel speed ramp up level over level.
const SPAWN_INTERVAL_SECONDS_BY_LEVEL = [1.3, 1.1, 0.95, 0.85];
const CROSS_SECONDS_BY_LEVEL = [1.9, 1.65, 1.4, 1.2];
const CHARACTER_X_RATIO = 0.24;
const JUMP_DURATION_MS = 650;
const MISS_RETRY_DELAY_MS = 700;
const LEVEL_CLEAR_PAUSE_MS = 500;
const NEXT_LEVEL_DELAY_MS = 1100;
const FINISH_DELAY_MS = 900;
const FIRST_SPAWN_DELAY_SECONDS = 0.4;

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
        <p class="puzzle-terminal__count">0 / ${REQUIRED_LEVELS}</p>
        <div class="stair-dodge__pips"></div>
        <div class="stair-dodge__stage">
          <div class="stair-dodge__ground"></div>
          <div class="stair-dodge__character"></div>
        </div>
        <p class="stair-dodge__taunt" hidden>헬 모드가 시작된다 😈</p>
        <div class="stair-dodge__banner" hidden></div>
      </div>
    </div>
  `;
  root.appendChild(node);

  const countLabel = node.querySelector(".puzzle-terminal__count");
  const screenEl = node.querySelector(".puzzle-terminal__screen");
  const pipsEl = node.querySelector(".stair-dodge__pips");
  const stageEl = node.querySelector(".stair-dodge__stage");
  const characterEl = node.querySelector(".stair-dodge__character");
  const tauntEl = node.querySelector(".stair-dodge__taunt");
  const bannerEl = node.querySelector(".stair-dodge__banner");
  const closeButton = node.querySelector(".puzzle-terminal__close");

  if (characterSprite) {
    characterEl.style.backgroundImage = `url("${characterSprite}")`;
  }

  let currentLevel = 0;
  let dodgedInLevel = 0;
  let spawnedInLevel = 0;
  let spawnTimer = 0;
  let obstacles = [];
  let isAirborne = false;
  let levelActive = false;
  let finished = false;
  let lastTimestamp = null;
  let frameId = null;
  let jumpTimeoutId = null;
  let advanceTimeoutId = null;

  function updateCount() {
    countLabel.textContent = `${currentLevel} / ${REQUIRED_LEVELS}`;
  }

  function renderPips() {
    pipsEl.innerHTML = "";
    for (let i = 0; i < OBSTACLES_PER_LEVEL; i += 1) {
      const pip = document.createElement("span");
      pip.className = "stair-dodge__pip";
      if (i < dodgedInLevel) {
        pip.classList.add("stair-dodge__pip--filled");
      }
      pipsEl.appendChild(pip);
    }
  }

  function clearObstacles() {
    for (const obstacle of obstacles) {
      obstacle.el.remove();
    }
    obstacles = [];
  }

  function spawnObstacle() {
    const el = document.createElement("div");
    el.className = "stair-dodge__obstacle";
    stageEl.appendChild(el);
    const centerRatio = 1.1;
    el.style.left = `${centerRatio * 100}%`;
    obstacles.push({ el, progress: 0, previousCenterRatio: centerRatio });
    spawnedInLevel += 1;
  }

  function startLevel() {
    bannerEl.hidden = true;
    clearObstacles();
    dodgedInLevel = 0;
    spawnedInLevel = 0;
    spawnTimer = -FIRST_SPAWN_DELAY_SECONDS;
    isAirborne = false;
    levelActive = true;
    characterEl.classList.remove("stair-dodge__character--jump");
    tauntEl.hidden = currentLevel !== HELL_MODE_LEVEL_INDEX;
    renderPips();
  }

  function showBanner(text) {
    bannerEl.textContent = text;
    bannerEl.hidden = false;
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
    levelActive = false;
    clearObstacles();
    audioManager.playSfx("qte_fail");
    flashResult(false);
    advanceTimeoutId = window.setTimeout(startLevel, MISS_RETRY_DELAY_MS);
  }

  function handleLevelCleared() {
    levelActive = false;
    clearObstacles();
    audioManager.playSfx("qte_success");
    flashResult(true);
    currentLevel += 1;
    updateCount();

    if (currentLevel >= REQUIRED_LEVELS) {
      audioManager.playSfx("mission_clear");
      advanceTimeoutId = window.setTimeout(() => {
        showBanner("CLEAR!");
        advanceTimeoutId = window.setTimeout(() => finish(true), FINISH_DELAY_MS);
      }, LEVEL_CLEAR_PAUSE_MS);
      return;
    }

    advanceTimeoutId = window.setTimeout(() => {
      showBanner("NEXT LEVEL");
      advanceTimeoutId = window.setTimeout(startLevel, NEXT_LEVEL_DELAY_MS);
    }, LEVEL_CLEAR_PAUSE_MS);
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

    if (event.code !== "Space" || event.repeat || !levelActive || isAirborne) {
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

    if (levelActive) {
      const spawnInterval = SPAWN_INTERVAL_SECONDS_BY_LEVEL[currentLevel];
      const crossSeconds = CROSS_SECONDS_BY_LEVEL[currentLevel];

      spawnTimer += deltaSeconds;
      if (spawnTimer >= spawnInterval && spawnedInLevel < OBSTACLES_PER_LEVEL) {
        spawnTimer -= spawnInterval;
        spawnObstacle();
      }

      // Resolve each obstacle exactly once, the instant its center passes
      // the character's - not the instant it enters some wider "danger"
      // band - so a jump timed anywhere before that instant still counts.
      let missed = false;
      for (const obstacle of obstacles) {
        obstacle.progress = Math.min(1, obstacle.progress + deltaSeconds / crossSeconds);
        const centerRatio = 1.1 - obstacle.progress * 1.2;
        obstacle.el.style.left = `${centerRatio * 100}%`;

        if (obstacle.previousCenterRatio >= CHARACTER_X_RATIO && centerRatio < CHARACTER_X_RATIO) {
          obstacle.resolved = true;
          if (!isAirborne) {
            missed = true;
          }
        }
        obstacle.previousCenterRatio = centerRatio;
      }

      if (missed) {
        handleMiss();
      } else {
        const stillResolved = obstacles.filter((obstacle) => obstacle.resolved);
        if (stillResolved.length > 0) {
          for (const obstacle of stillResolved) {
            obstacle.el.remove();
          }
          obstacles = obstacles.filter((obstacle) => !obstacle.resolved);
          dodgedInLevel += stillResolved.length;
          renderPips();

          if (dodgedInLevel >= OBSTACLES_PER_LEVEL) {
            handleLevelCleared();
          }
        }
      }
    }

    frameId = requestAnimationFrame(tick);
  }

  node.addEventListener("click", handleClick);
  window.addEventListener("keydown", handleKeyDown);
  closeButton.focus();
  audioManager.playSfx("qte_start");
  updateCount();
  startLevel();
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
