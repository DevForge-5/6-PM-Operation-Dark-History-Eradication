import { clearInput, createGameState, getMovementVector, setDirection } from "./game-state.js";

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

  if (deltaX !== 0 && canOccupy(x + deltaX, y)) {
    x += deltaX;
  }

  if (deltaY !== 0 && canOccupy(x, y + deltaY)) {
    y += deltaY;
  }

  return { x, y };
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
  constructor({ canvas, controls, loadingMessage, assetError, config }) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
    this.controls = [...controls];
    this.loadingMessage = loadingMessage;
    this.assetError = assetError;
    this.config = config;
    this.state = createGameState(config);
    this.images = null;
    this.mapPixels = null;
    this.animationFrameId = null;
    this.previousTimestamp = null;
    this.pointerDirections = new Map();

    this.context.imageSmoothingEnabled = false;
    this.canvas.width = config.canvas.width;
    this.canvas.height = config.canvas.height;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleOrientationChange = this.handleOrientationChange.bind(this);
    this.tick = this.tick.bind(this);
  }

  async start() {
    this.bindEvents();

    try {
      const [map, player, monster] = await Promise.all([
        loadImage(this.config.assets.map),
        loadImage(this.config.assets.player),
        loadImage(this.config.assets.monster),
      ]);

      this.images = { map, player, monster };
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
    collisionCanvas.width = this.config.canvas.width;
    collisionCanvas.height = this.config.canvas.height;
    const collisionContext = collisionCanvas.getContext("2d", { willReadFrequently: true });
    collisionContext.imageSmoothingEnabled = false;
    collisionContext.clearRect(0, 0, collisionCanvas.width, collisionCanvas.height);
    collisionContext.drawImage(
      this.images.map,
      this.config.mapCrop.x,
      this.config.mapCrop.y,
      this.config.mapCrop.width,
      this.config.mapCrop.height,
      0,
      0,
      this.config.canvas.width,
      this.config.canvas.height,
    );
    this.mapPixels = collisionContext.getImageData(0, 0, collisionCanvas.width, collisionCanvas.height).data;
  }

  isWalkablePixel(x, y) {
    const pixelX = Math.floor(x);
    const pixelY = Math.floor(y);
    if (pixelX < 0 || pixelY < 0 || pixelX >= this.config.canvas.width || pixelY >= this.config.canvas.height) {
      return false;
    }

    const index = (pixelY * this.config.canvas.width + pixelX) * 4;
    const red = this.mapPixels[index];
    const green = this.mapPixels[index + 1];
    const blue = this.mapPixels[index + 2];
    const alpha = this.mapPixels[index + 3];
    return alpha > 32 && green > 45 && green > red * 1.12 && green > blue * 1.18;
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

  getMonsterCollisionBox() {
    const monster = this.config.monster;
    return {
      x: monster.x + monster.collisionInsetX,
      y: monster.y + monster.collisionTop,
      width: monster.size - monster.collisionInsetX * 2,
      height: monster.size - monster.collisionTop - monster.collisionBottom,
    };
  }

  canPlayerOccupy(x, y) {
    const player = this.config.player;
    if (
      x < 0
      || y < 0
      || x + player.size > this.config.canvas.width
      || y + player.size > this.config.canvas.height
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

    return !rectanglesOverlap(this.getPlayerCollisionBox(x, y), this.getMonsterCollisionBox());
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
  }

  render() {
    const { width, height } = this.config.canvas;
    const crop = this.config.mapCrop;
    const player = this.state.player;
    const monster = this.state.monster;

    this.context.fillStyle = "#ffffff";
    this.context.fillRect(0, 0, width, height);
    this.context.drawImage(this.images.map, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
    this.context.drawImage(this.images.monster, monster.x, monster.y, monster.size, monster.size);
    this.context.drawImage(this.images.player, player.x, player.y, player.size, player.size);

    this.canvas.dataset.playerX = player.x.toFixed(2);
    this.canvas.dataset.playerY = player.y.toFixed(2);
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
    this.render();
    this.animationFrameId = requestAnimationFrame(this.tick);
  }
}
