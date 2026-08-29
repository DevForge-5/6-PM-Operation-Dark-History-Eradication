const DIRECTIONS = Object.freeze(["up", "down", "left", "right"]);

export function createInputState() {
  return {
    keyboard: { up: false, down: false, left: false, right: false },
    touch: { up: false, down: false, left: false, right: false },
  };
}

export function createGameState(config) {
  return {
    player: {
      x: config.player.x,
      y: config.player.y,
      size: config.player.size,
    },
    monster: {
      x: config.monster.x,
      y: config.monster.y,
      size: config.monster.size,
    },
    input: createInputState(),
    isRunning: false,
  };
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
