import { audioManager } from "../audio/audio-manager.js";

const REQUIRED_LEVELS = 4;
const HELL_MODE_LEVEL_INDEX = REQUIRED_LEVELS - 1;
// Like Chrome's dino run: obstacles keep coming continuously within a
// level (not one at a time with a stop after each), and both spawn rate
// and travel speed ramp up level over level.
export const STAIR_DODGE_LEVELS = Object.freeze([
  Object.freeze({ spawnInterval: 1.1, crossSeconds: 1.55, requiredDodges: 5, damage: 10 }),
  Object.freeze({ spawnInterval: 0.95, crossSeconds: 1.35, requiredDodges: 5, damage: 10 }),
  Object.freeze({ spawnInterval: 0.8, crossSeconds: 1.15, requiredDodges: 5, damage: 10 }),
  Object.freeze({ spawnInterval: 0.78, crossSeconds: 1.1, requiredDodges: 6, damage: 5 }),
]);
const CHARACTER_START_X_RATIO = 0.24;
const CHARACTER_MIN_X_RATIO = 0.08;
const CHARACTER_MAX_X_RATIO = 0.92;
const CHARACTER_MOVE_SPEED_RATIO = 0.62;
const COLLISION_RADIUS_RATIO = 0.075;
const JUMP_DURATION_MS = 650;
// A press queued mid-air (see startJump's comment) may chain into one more
// jump so close obstacles can be cleared without a grounded beat between
// them - but only once. Without this cap, mashing Space keeps re-queuing a
// chain on every jump, so isAirborne (the collision-immunity flag) never
// goes false and the player takes no damage no matter what they touch.
const MAX_JUMP_CHAIN = 1;
const MISS_RETRY_DELAY_MS = 700;
const LEVEL_CLEAR_PAUSE_MS = 500;
const NEXT_LEVEL_DELAY_MS = 1100;
const FINISH_DELAY_MS = 900;
const FIRST_SPAWN_DELAY_SECONDS = 0.4;

export function createStairDodge({ root, characterSprite, onComplete, onClose, onDamage }) {
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
        <p class="puzzle-terminal__hint">A/D 이동 · SPACE 점프</p>
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
  let bufferedJump = false;
  let jumpChainDepth = 0;
  let levelActive = false;
  let finished = false;
  let isPaused = false;
  let lastTimestamp = null;
  let frameId = null;
  let jumpTimeoutId = null;
  let advanceTimeoutId = null;
  let characterXRatio = CHARACTER_START_X_RATIO;
  const movement = { left: false, right: false };

  function getLevelSettings() {
    return STAIR_DODGE_LEVELS[currentLevel];
  }

  function updateCharacterPosition() {
    characterEl.style.left = `${characterXRatio * 100}%`;
  }

  function updateCount() {
    countLabel.textContent = `${currentLevel} / ${REQUIRED_LEVELS}`;
  }

  function renderPips() {
    pipsEl.innerHTML = "";
    for (let i = 0; i < getLevelSettings().requiredDodges; i += 1) {
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
    bufferedJump = false;
    jumpChainDepth = 0;
    characterXRatio = CHARACTER_START_X_RATIO;
    movement.left = false;
    movement.right = false;
    updateCharacterPosition();
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
    window.removeEventListener("keyup", handleKeyUp);
    window.removeEventListener("blur", clearMovement);
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
    const shouldContinue = onDamage?.(getLevelSettings().damage, {
      level: currentLevel + 1,
      isHell: currentLevel === HELL_MODE_LEVEL_INDEX,
    });
    if (shouldContinue === false || finished) {
      return;
    }
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

  function startJump(isChain = false) {
    jumpChainDepth = isChain ? jumpChainDepth + 1 : 0;
    isAirborne = true;
    characterEl.classList.remove("stair-dodge__character--jump");
    // eslint-disable-next-line no-unused-expressions
    characterEl.offsetWidth;
    characterEl.classList.add("stair-dodge__character--jump");
    jumpTimeoutId = window.setTimeout(() => {
      isAirborne = false;
      // A press that landed while still airborne (mashing ahead of the next
      // obstacle, which is normal at hell-mode's pace) queues here instead
      // of being silently dropped - fire it the instant this jump ends so
      // back-to-back obstacles can be chained without missing a beat.
      if (bufferedJump && levelActive) {
        bufferedJump = false;
        startJump(true);
      }
    }, JUMP_DURATION_MS);
  }

  function handleKeyDown(event) {
    if (finished) {
      return;
    }

    const direction = {
      KeyA: "left",
      ArrowLeft: "left",
      KeyD: "right",
      ArrowRight: "right",
    }[event.code];
    if (direction) {
      event.preventDefault();
      if (levelActive && !isPaused) {
        movement[direction] = true;
      }
      return;
    }

    if (event.code !== "Space") {
      return;
    }

    // Always swallow Space here, even on the early-return paths below - the
    // close button holds focus (see closeButton.focus() at the bottom),
    // and the browser's default "Space activates the focused button"
    // behavior would otherwise close this out from under the player mid-run.
    // Only the mouse click on the X (handleClick) is allowed to close it.
    event.preventDefault();

    if (event.repeat || !levelActive || isPaused) {
      return;
    }

    if (isAirborne) {
      // Capped so mashing Space can't keep re-queuing a chain forever and
      // holding isAirborne (collision immunity) on indefinitely - see
      // MAX_JUMP_CHAIN.
      if (jumpChainDepth < MAX_JUMP_CHAIN) {
        bufferedJump = true;
      }
      return;
    }

    startJump();
  }

  function handleKeyUp(event) {
    const direction = {
      KeyA: "left",
      ArrowLeft: "left",
      KeyD: "right",
      ArrowRight: "right",
    }[event.code];
    if (!direction) {
      return;
    }
    event.preventDefault();
    movement[direction] = false;
  }

  function clearMovement() {
    movement.left = false;
    movement.right = false;
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

    if (isPaused) {
      frameId = requestAnimationFrame(tick);
      return;
    }

    if (levelActive) {
      const settings = getLevelSettings();
      const spawnInterval = settings.spawnInterval;
      const crossSeconds = settings.crossSeconds;
      const movementDirection = Number(movement.right) - Number(movement.left);
      characterXRatio = Math.min(
        CHARACTER_MAX_X_RATIO,
        Math.max(CHARACTER_MIN_X_RATIO, characterXRatio + movementDirection * CHARACTER_MOVE_SPEED_RATIO * deltaSeconds),
      );
      updateCharacterPosition();

      spawnTimer += deltaSeconds;
      if (spawnTimer >= spawnInterval && spawnedInLevel < settings.requiredDodges) {
        spawnTimer -= spawnInterval;
        spawnObstacle();
      }

      let missed = false;
      for (const obstacle of obstacles) {
        obstacle.progress = Math.min(1, obstacle.progress + deltaSeconds / crossSeconds);
        const centerRatio = 1.1 - obstacle.progress * 1.2;
        obstacle.el.style.left = `${centerRatio * 100}%`;

        const collisionMin = Math.min(obstacle.previousCenterRatio, centerRatio) - COLLISION_RADIUS_RATIO;
        const collisionMax = Math.max(obstacle.previousCenterRatio, centerRatio) + COLLISION_RADIUS_RATIO;
        if (!isAirborne && characterXRatio >= collisionMin && characterXRatio <= collisionMax) {
          missed = true;
          break;
        }
        if (obstacle.progress >= 1) {
          obstacle.resolved = true;
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

          if (dodgedInLevel >= settings.requiredDodges) {
            handleLevelCleared();
          }
        }
      }
    }

    frameId = requestAnimationFrame(tick);
  }

  node.addEventListener("click", handleClick);
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", clearMovement);
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

  function setPaused(next) {
    isPaused = next;
    if (isPaused) {
      clearMovement();
    }
  }

  return { node, destroy, setPaused };
}
