const DIRECTIONS = Object.freeze(["up", "down", "left", "right"]);

export function createInputState() {
  return {
    keyboard: { up: false, down: false, left: false, right: false },
    touch: { up: false, down: false, left: false, right: false },
  };
}

export function createStats(config) {
  return {
    timeMinutes: config.stats.startMinutes,
    limitMinutes: config.stats.limitMinutes,
    hp: config.stats.hpMax,
    hpMax: config.stats.hpMax,
    cringe: 0,
    cringeMax: config.stats.cringeMax,
  };
}

export function createGameState(config) {
  return {
    player: {
      x: config.player.x,
      y: config.player.y,
      size: config.player.size,
      facing: "down",
    },
    encounters: config.encounters.map((encounter) => ({
      id: encounter.id,
      eventId: encounter.eventId,
      x: encounter.x,
      y: encounter.y,
      size: encounter.size,
      collisionInsetX: encounter.collisionInsetX,
      collisionTop: encounter.collisionTop,
      collisionBottom: encounter.collisionBottom,
      skipDefaultRender: encounter.skipDefaultRender,
      enabled: true,
    })),
    pickups: config.pickups.map((pickup) => ({
      id: pickup.id,
      itemId: pickup.itemId,
      x: pickup.x,
      y: pickup.y,
      size: pickup.size,
      enabled: true,
    })),
    stats: createStats(config),
    input: createInputState(),
    isRunning: false,
    isPaused: false,
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// 프레임마다 실수(deltaSeconds) 단위로 값을 누적하다 보면 부동소수점 오차가
// 쌓여 20.47999999999979 같은 값이 남는다. 정수로 반올림하면 누적 데미지
// 총량 자체가 틀어지므로(예: 초당 80데미지 1초가 76.8이 아닌 60으로 깎임),
// 소수 둘째 자리까지만 정리해 표현 오차만 제거하고 누적값은 그대로 보존한다.
function roundToPrecision(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function applyHpDelta(stats, delta) {
  stats.hp = roundToPrecision(clamp(stats.hp + delta, 0, stats.hpMax));
  return stats.hp;
}

export function applyCringeDelta(stats, delta) {
  stats.cringe = roundToPrecision(clamp(stats.cringe + delta, 0, stats.cringeMax));
  return stats.cringe;
}

export function advanceTime(stats, minutesDelta) {
  stats.timeMinutes = Math.min(stats.timeMinutes + minutesDelta, stats.limitMinutes);
  return stats.timeMinutes;
}

export function isHpDepleted(stats) {
  return stats.hp <= 0;
}

export function isCringeMaxed(stats) {
  return stats.cringe >= stats.cringeMax;
}

export function isTimeUp(stats) {
  return stats.timeMinutes >= stats.limitMinutes;
}

export function formatClock(stats) {
  const hours = Math.floor(stats.timeMinutes / 60);
  const minutes = Math.floor(stats.timeMinutes % 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function setDirection(input, source, direction, isPressed) {
  if (!DIRECTIONS.includes(direction) || !(source in input)) {
    return;
  }

  input[source][direction] = isPressed;
}

export function clearInput(input) {
  for (const source of Object.values(input)) {
    for (const direction of DIRECTIONS) {
      source[direction] = false;
    }
  }
}

export function getMovementVector(input) {
  const up = input.keyboard.up || input.touch.up;
  const down = input.keyboard.down || input.touch.down;
  const left = input.keyboard.left || input.touch.left;
  const right = input.keyboard.right || input.touch.right;
  const x = Number(right) - Number(left);
  const y = Number(down) - Number(up);
  const length = Math.hypot(x, y);

  if (length === 0) {
    return { x: 0, y: 0 };
  }

  return { x: x / length, y: y / length };
}

export function getFacingDirection(movement, currentFacing) {
  if (movement.x === 0 && movement.y === 0) {
    return currentFacing;
  }

  if (Math.abs(movement.x) >= Math.abs(movement.y)) {
    return movement.x > 0 ? "right" : "left";
  }

  return movement.y > 0 ? "down" : "up";
}
