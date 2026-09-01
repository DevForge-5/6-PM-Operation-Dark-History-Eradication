import { clearInput, createGameState, getFacingDirection, getMovementVector, setDirection } from "./game-state.js";

const KEY_DIRECTIONS = Object.freeze({
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
});

function rectanglesOverlap(first, second) {
  return (
    first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y
  );
}

export function moveWithAxisCollisions(position, deltaX, deltaY, canOccupy) {
  let x = position.x;
  let y = position.y;

  const horizontalSteps = Math.ceil(Math.abs(deltaX));
  const horizontalStep = horizontalSteps === 0 ? 0 : deltaX / horizontalSteps;
  for (let step = 0; step < horizontalSteps; step += 1) {
    if (!canOccupy(x + horizontalStep, y)) {
      break;
    }
    x += horizontalStep;
  }

  const verticalSteps = Math.ceil(Math.abs(deltaY));
  const verticalStep = verticalSteps === 0 ? 0 : deltaY / verticalSteps;
  for (let step = 0; step < verticalSteps; step += 1) {
    if (!canOccupy(x, y + verticalStep)) {
      break;
    }
    y += verticalStep;
  }

  return { x, y };
}

export function getCameraPosition(player, config, viewport = config.canvas) {
  const targetX = player.x + player.size / 2 - viewport.width / 2;
  const targetY = player.y + player.size / 2 - viewport.height / 2;
  return {
    x: Math.max(0, Math.min(targetX, Math.max(0, config.world.width - viewport.width))),
    y: Math.max(0, Math.min(targetY, Math.max(0, config.world.height - viewport.height))),
  };
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => reject(new Error(`Failed to load ${source}`)), { once: true });
    image.src = source;
  });
}

export class GameController {
  constructor({
    canvas,
    controls,
    loadingMessage,
    assetError,
    config,
    stats,
    clearedEventIds,
    collectedItemIds,
    onFrame,
    onEncounter,
    onReachGoal,
    onPickup,
  }) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
    this.controls = [...controls];
    this.loadingMessage = loadingMessage;
    this.assetError = assetError;
    this.config = config;
    this.state = createGameState(config);
    if (stats) {
      this.state.stats = stats;
    }
    if (clearedEventIds) {
      for (const encounter of this.state.encounters) {
        if (clearedEventIds.has(encounter.eventId)) {
          encounter.enabled = false;
        }
      }
    }
    if (collectedItemIds) {
      for (const pickup of this.state.pickups) {
        if (collectedItemIds.has(pickup.itemId)) {
          pickup.enabled = false;
        }
      }
    }
    this.onPickup = onPickup;
    this.onFrame = onFrame;
    this.onEncounter = onEncounter;
    this.onReachGoal = onReachGoal;
    this.triggeredEncounterId = null;
    this.goalReached = false;
    this.viewport = { ...config.canvas };
    this.images = null;
    this.mapPixels = null;
    this.animationFrameId = null;
    this.previousTimestamp = null;
    this.pointerDirections = new Map();

    this.canvas.width = config.canvas.width;
    this.canvas.height = config.canvas.height;
    this.context.imageSmoothingEnabled = false;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleOrientationChange = this.handleOrientationChange.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.tick = this.tick.bind(this);

    this.handleResize();
  }

  async start() {
    this.bindEvents();

    try {
      const [map, playerDown, playerUp, playerLeft, playerRight, monster] = await Promise.all([
        loadImage(this.config.assets.map),
        loadImage(this.config.assets.player.down),
        loadImage(this.config.assets.player.up),
        loadImage(this.config.assets.player.left),
        loadImage(this.config.assets.player.right),
        loadImage(this.config.assets.monster),
      ]);

      this.images = {
        map,
        monster,
        player: { down: playerDown, up: playerUp, left: playerLeft, right: playerRight },
      };
      this.prepareMapCollision();
      this.loadingMessage.hidden = true;
      this.state.isRunning = true;
      this.canvas.focus({ preventScroll: true });
      this.animationFrameId = requestAnimationFrame(this.tick);
    } catch (error) {
      console.error(error);
      this.loadingMessage.hidden = true;
      this.assetError.hidden = false;
    }
  }

  bindEvents() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
    window.addEventListener("resize", this.handleResize);
    window.addEventListener("orientationchange", this.handleOrientationChange);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    for (const button of this.controls) {
      button.addEventListener("pointerdown", (event) => this.handlePointerDown(event, button));
      button.addEventListener("pointerup", (event) => this.releasePointer(event.pointerId));
      button.addEventListener("pointercancel", (event) => this.releasePointer(event.pointerId));
      button.addEventListener("lostpointercapture", (event) => this.releasePointer(event.pointerId));
      button.addEventListener("contextmenu", (event) => event.preventDefault());
    }
  }

  destroy() {
    this.state.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("orientationchange", this.handleOrientationChange);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
  }

  handleKeyDown(event) {
    const direction = KEY_DIRECTIONS[event.code];
    if (!direction) {
      return;
    }

    event.preventDefault();
    setDirection(this.state.input, "keyboard", direction, true);
  }

  handleKeyUp(event) {
    const direction = KEY_DIRECTIONS[event.code];
    if (!direction) {
      return;
    }

    event.preventDefault();
    setDirection(this.state.input, "keyboard", direction, false);
  }

  handlePointerDown(event, button) {
    event.preventDefault();
    const direction = button.dataset.direction;
    this.pointerDirections.set(event.pointerId, direction);
    button.setPointerCapture(event.pointerId);
    this.syncTouchInput();
  }

  releasePointer(pointerId) {
    this.pointerDirections.delete(pointerId);
    this.syncTouchInput();
  }

  syncTouchInput() {
    const activeDirections = new Set(this.pointerDirections.values());

    for (const button of this.controls) {
      const direction = button.dataset.direction;
      const isPressed = activeDirections.has(direction);
      setDirection(this.state.input, "touch", direction, isPressed);
      button.classList.toggle("is-pressed", isPressed);
    }
  }

  handleBlur() {
    this.clearAllInput();
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.clearAllInput();
    }
  }

  handleOrientationChange() {
    this.clearAllInput();
    this.previousTimestamp = null;
    requestAnimationFrame(this.handleResize);
  }

  handleResize() {
    this.clearAllInput();
    const width = Math.max(1, Math.round(this.canvas.clientWidth || this.config.canvas.width));
    const height = Math.max(1, Math.round(this.canvas.clientHeight || this.config.canvas.height));

    if (this.viewport.width === width && this.viewport.height === height) {
      return;
    }

    this.viewport = { width, height };
    this.canvas.width = width;
    this.canvas.height = height;
    this.context.imageSmoothingEnabled = false;
    this.previousTimestamp = null;

    if (this.images) {
      this.render();
    }
  }

  clearAllInput() {
    clearInput(this.state.input);
    this.pointerDirections.clear();
    for (const button of this.controls) {
      button.classList.remove("is-pressed");
    }
  }

  prepareMapCollision() {
    const collisionCanvas = document.createElement("canvas");
    collisionCanvas.width = this.config.world.width;
    collisionCanvas.height = this.config.world.height;
    const collisionContext = collisionCanvas.getContext("2d", { willReadFrequently: true });
    collisionContext.imageSmoothingEnabled = false;
    collisionContext.clearRect(0, 0, collisionCanvas.width, collisionCanvas.height);
    collisionContext.drawImage(this.images.map, 0, 0);
    this.mapPixels = collisionContext.getImageData(0, 0, collisionCanvas.width, collisionCanvas.height).data;
  }

  isWalkablePixel(x, y) {
    const pixelX = Math.floor(x);
    const pixelY = Math.floor(y);
    if (pixelX < 0 || pixelY < 0 || pixelX >= this.config.world.width || pixelY >= this.config.world.height) {
      return false;
    }

    const index = (pixelY * this.config.world.width + pixelX) * 4;
    const red = this.mapPixels[index];
    const green = this.mapPixels[index + 1];
    const blue = this.mapPixels[index + 2];
    const alpha = this.mapPixels[index + 3];
    return (
      alpha > 32
      && green >= this.config.collision.minimumGreen
      && green > red * 1.12
      && green > blue * 1.18
    );
  }

  getPlayerCollisionBox(x, y) {
    const player = this.config.player;
    return {
      x: x + player.collisionInsetX,
      y: y + player.collisionTop,
      width: player.size - player.collisionInsetX * 2,
      height: player.size - player.collisionTop - player.collisionBottom,
    };
  }

  getEncounterCollisionBox(encounter) {
    return {
      x: encounter.x + encounter.collisionInsetX,
      y: encounter.y + encounter.collisionTop,
      width: encounter.size - encounter.collisionInsetX * 2,
      height: encounter.size - encounter.collisionTop - encounter.collisionBottom,
    };
  }

  getGoalBox() {
    const goal = this.config.goal;
    return { x: goal.x, y: goal.y, width: goal.size, height: goal.size };
  }

  canPlayerOccupy(x, y) {
    const player = this.config.player;
    if (
      x < 0
      || y < 0
      || x + player.size > this.config.world.width
      || y + player.size > this.config.world.height
    ) {
      return false;
    }

    const footY = y + player.size - player.footInsetY;
    const footPoints = [
      { x: x + player.footInsetX, y: footY },
      { x: x + player.size / 2, y: footY },
      { x: x + player.size - player.footInsetX, y: footY },
    ];

    if (!footPoints.every((point) => this.isWalkablePixel(point.x, point.y))) {
      return false;
    }

    const playerBox = this.getPlayerCollisionBox(x, y);
    for (const encounter of this.state.encounters) {
      if (!encounter.enabled) {
        continue;
      }

      if (rectanglesOverlap(playerBox, this.getEncounterCollisionBox(encounter))) {
        if (!this.triggeredEncounterId) {
          this.triggeredEncounterId = encounter.id;
          this.onEncounter?.(encounter.eventId);
        }
        return false;
      }
    }

    return true;
  }

  update(deltaSeconds) {
    const movement = getMovementVector(this.state.input);
    const distance = this.config.movementSpeed * deltaSeconds;
    const nextPosition = moveWithAxisCollisions(
      this.state.player,
      movement.x * distance,
      movement.y * distance,
      (x, y) => this.canPlayerOccupy(x, y),
    );
    this.state.player.x = nextPosition.x;
    this.state.player.y = nextPosition.y;
    this.state.player.facing = getFacingDirection(movement, this.state.player.facing);

    const playerBox = this.getPlayerCollisionBox(this.state.player.x, this.state.player.y);

    if (!this.goalReached && this.config.goal) {
      if (rectanglesOverlap(playerBox, this.getGoalBox())) {
        this.goalReached = true;
        this.onReachGoal?.();
      }
    }

    for (const pickup of this.state.pickups) {
      if (!pickup.enabled) {
        continue;
      }

      const pickupBox = { x: pickup.x, y: pickup.y, width: pickup.size, height: pickup.size };
      if (rectanglesOverlap(playerBox, pickupBox)) {
        pickup.enabled = false;
        this.onPickup?.(pickup.itemId);
      }
    }
  }

  render() {
    const { width, height } = this.viewport;
    const player = this.state.player;
    const camera = getCameraPosition(player, this.config, this.viewport);
    const mapWidth = Math.min(width, this.config.world.width);
    const mapHeight = Math.min(height, this.config.world.height);

    this.context.fillStyle = "#ffffff";
    this.context.fillRect(0, 0, width, height);
    this.context.drawImage(this.images.map, camera.x, camera.y, mapWidth, mapHeight, 0, 0, mapWidth, mapHeight);

    if (this.config.goal) {
      const goal = this.config.goal;
      this.context.fillStyle = "rgba(120, 220, 255, 0.35)";
      this.context.fillRect(goal.x - camera.x, goal.y - camera.y, goal.size, goal.size);
      this.context.strokeStyle = "#78dcff";
      this.context.lineWidth = 2;
      this.context.strokeRect(goal.x - camera.x, goal.y - camera.y, goal.size, goal.size);
    }

    for (const pickup of this.state.pickups) {
      if (!pickup.enabled) {
        continue;
      }

      const centerX = pickup.x - camera.x + pickup.size / 2;
      const centerY = pickup.y - camera.y + pickup.size / 2;
      this.context.fillStyle = "#ffd76a";
      this.context.beginPath();
      this.context.arc(centerX, centerY, pickup.size / 2, 0, Math.PI * 2);
      this.context.fill();
      this.context.strokeStyle = "#a9702a";
      this.context.lineWidth = 2;
      this.context.stroke();
    }

    for (const encounter of this.state.encounters) {
      if (!encounter.enabled) {
        continue;
      }

      this.context.drawImage(
        this.images.monster,
        encounter.x - camera.x,
        encounter.y - camera.y,
        encounter.size,
        encounter.size,
      );
    }

    this.context.drawImage(
      this.images.player[player.facing],
      player.x - camera.x,
      player.y - camera.y,
      player.size,
      player.size,
    );

    this.canvas.dataset.playerX = player.x.toFixed(2);
    this.canvas.dataset.playerY = player.y.toFixed(2);
    this.canvas.dataset.cameraX = camera.x.toFixed(2);
    this.canvas.dataset.cameraY = camera.y.toFixed(2);
  }

  tick(timestamp) {
    if (!this.state.isRunning) {
      return;
    }

    if (this.previousTimestamp === null) {
      this.previousTimestamp = timestamp;
    }

    const elapsedSeconds = Math.min(
      (timestamp - this.previousTimestamp) / 1000,
      this.config.maxDeltaSeconds,
    );
    this.previousTimestamp = timestamp;
    this.update(elapsedSeconds);
    if (!this.state.isRunning) {
      return;
    }

    this.render();
    this.onFrame?.(this.state);
    this.animationFrameId = requestAnimationFrame(this.tick);
  }
}
