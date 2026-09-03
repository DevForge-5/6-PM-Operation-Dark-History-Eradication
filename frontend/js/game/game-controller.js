import {
  applyHpDelta,
  clearInput,
  createGameState,
  getFacingDirection,
  getMovementVector,
  isHpDepleted,
  setDirection,
} from "./game-state.js";
import { SirenFight } from "./siren-fight.js";

export const SIREN_EVENT_ID = "musicRoomSiren";

const CAMERA_SMOOTHING_TIME_CONSTANT = 0.2;

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

export function getPrincipalState(elapsedSeconds, timing) {
  const cycleDuration = timing.seatedSeconds + timing.suspiciousSeconds + timing.alertSeconds;
  const cycleElapsed = elapsedSeconds % cycleDuration;
  if (cycleElapsed < timing.seatedSeconds) {
    return "seated";
  }
  if (cycleElapsed < timing.seatedSeconds + timing.suspiciousSeconds) {
    return "suspicious";
  }
  return "alert";
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

function getRoomBounds(room) {
  const marginTop = room.marginTop ?? room.margin ?? 0;
  const marginBottom = room.marginBottom ?? room.margin ?? 0;
  const marginLeft = room.marginLeft ?? room.margin ?? 0;
  const marginRight = room.marginRight ?? room.margin ?? 0;
  return {
    minX: room.x - marginLeft,
    minY: room.y - marginTop,
    maxX: room.x + room.width + marginRight,
    maxY: room.y + room.height + marginBottom,
  };
}

function findRoomForPoint(rooms, x, y) {
  if (!rooms) {
    return null;
  }

  return rooms.find((room) => {
    const bounds = getRoomBounds(room);
    return x >= bounds.minX && x < bounds.maxX && y >= bounds.minY && y < bounds.maxY;
  }) ?? null;
}

function getFrameBounds(room) {
  const padding = room.framePadding ?? 0;
  return {
    minX: room.x - padding,
    minY: room.y - padding,
    maxX: room.x + room.width + padding,
    maxY: room.y + room.height + padding,
  };
}

function clampToRange(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function clampCameraAxis(target, visibleSize, min, max) {
  const span = Math.max(0, max - min);
  if (span <= visibleSize) {
    return min + (span - visibleSize) / 2;
  }
  return clampToRange(target, min, max - visibleSize);
}

export function getCameraPosition(player, config, viewport = config.canvas, zoomOverride = config.camera.zoom) {
  const centerX = player.x + player.size / 2;
  const centerY = player.y + player.size / 2;
  const footX = player.x + player.size / 2;
  const footY = player.y + player.size - config.player.footInsetY;
  const room = findRoomForPoint(config.rooms, footX, footY);
  const bounds = room
    ? getFrameBounds(room)
    : { minX: 0, minY: 0, maxX: config.world.width, maxY: config.world.height };

  let zoom = zoomOverride;
  if (room) {
    const fitZoomX = viewport.width / (bounds.maxX - bounds.minX);
    const fitZoomY = viewport.height / (bounds.maxY - bounds.minY);
    zoom = Math.min(zoom, fitZoomX, fitZoomY);
  }

  const visibleWidth = Math.min(viewport.width / zoom, config.world.width);
  const visibleHeight = Math.min(viewport.height / zoom, config.world.height);
  const targetX = centerX - visibleWidth / 2;
  const targetY = centerY - visibleHeight / 2;

  const x = clampCameraAxis(targetX, visibleWidth, bounds.minX, bounds.maxX);
  const y = clampCameraAxis(targetY, visibleHeight, bounds.minY, bounds.maxY);

  return {
    zoom,
    room,
    x: clampToRange(x, 0, Math.max(0, config.world.width - visibleWidth)),
    y: clampToRange(y, 0, Math.max(0, config.world.height - visibleHeight)),
  };
}

export function createWalkableTileMap(tileRows) {
  const columns = tileRows[0]?.length ?? 0;
  if (columns === 0 || tileRows.some((row) => row.length !== columns)) {
    throw new Error("Invalid walkable tile map");
  }

  return {
    columns,
    rows: tileRows.length,
    data: Uint8Array.from(tileRows.join(""), (tile) => Number(tile === "#")),
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
    playerPosition,
    clearedEventIds,
    collectedItemIds,
    triggeredHazardIds,
    defeatedEncounterId,
    onFrame,
    onEncounter,
    onReachGoal,
    onPickup,
    onDamage,
    onPlayerDeath,
    onReady,
    onIntroRevealEnd,
    onPrincipalStateChange,
    onDefeatAnimationEnd,
    playIntroReveal = false,
    reducedMotion = false,
    onHazardTriggered,
    onComputerInteract,
    onSirenFightTrigger,
    onSirenDialogue,
    onSirenFightEnd,
    onSirenFightUpdate,
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
    if (playerPosition) {
      this.state.player.x = playerPosition.x;
      this.state.player.y = playerPosition.y;
      this.state.player.facing = playerPosition.facing ?? this.state.player.facing;
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
    this.onDamage = onDamage;
    this.onPlayerDeath = onPlayerDeath;
    this.onReady = onReady;
    this.onIntroRevealEnd = onIntroRevealEnd;
    this.onPrincipalStateChange = onPrincipalStateChange;
    this.onDefeatAnimationEnd = onDefeatAnimationEnd;
    this.onHazardTriggered = onHazardTriggered;
    this.onComputerInteract = onComputerInteract;
    this.onSirenFightTrigger = onSirenFightTrigger;
    this.onSirenFightEnd = onSirenFightEnd;
    this.puzzleSolved = Boolean(triggeredHazardIds?.has("officePuzzleSolved"));
    this.sirenFightCleared = Boolean(clearedEventIds?.has(SIREN_EVENT_ID));
    this.sirenFightArmed = false;
    this.sirenFight = new SirenFight({
      config,
      onDamage: (amount) => this.takeDamage(amount),
      onSirenHit: () => this.onSirenFightUpdate?.(this.sirenFight.snapshot),
      onDialogue: (dialogueId) => onSirenDialogue?.(dialogueId),
      onFinish: (hasWon) => this.handleSirenFightEnd(hasWon),
      onUpdate: (snapshot) => onSirenFightUpdate?.(snapshot),
    });
    this.onSirenFightUpdate = onSirenFightUpdate;
    this.isNearComputer = false;
    this.triggeredEncounterId = null;
    this.goalReached = false;
    this.viewport = { ...config.canvas };
    this.images = null;
    this.walkableTiles = null;
    this.animationFrameId = null;
    this.previousTimestamp = null;
    this.pointerDirections = new Map();
    this.playerAnimationFrame = 0;
    this.playerAnimationElapsed = 0;
    this.defeatAnimation = this.state.encounters.find(
      (encounter) => encounter.eventId === defeatedEncounterId,
    ) ?? null;
    if (this.defeatAnimation) {
      this.defeatAnimation.elapsedSeconds = 0;
    }
    this.isInPrincipalDanger = false;
    this.isInOffice = false;
    this.officeRevealProgress = 0;
    this.smoothCamera = null;
    this.principalElapsedSeconds = 0;
    this.principalState = "seated";
    const vaseAttackAlreadyTriggered = Boolean(triggeredHazardIds?.has("officeVaseAttack"));
    const vaseSourceIndexes = config.office.vaseAttack.sourceVaseIndexes;
    this.vaseAttack = {
      triggered: vaseAttackAlreadyTriggered,
      // Already resolved in an earlier visit to the office: skip straight to
      // "all vases already thrown" so reloading doesn't replay the sequence.
      nextShot: vaseAttackAlreadyTriggered ? vaseSourceIndexes.length : 0,
      shotDelay: 0,
      projectiles: [],
      droppedVaseIndexes: new Set(vaseAttackAlreadyTriggered ? vaseSourceIndexes : []),
    };
    this.damageFeedbackCooldown = 0;
    this.playerDefeated = false;
    this.visionRadius = config.player.size * 2.5;
    this.shouldPlayIntroReveal = Boolean(playIntroReveal);
    this.isInputLocked = this.shouldPlayIntroReveal;
    this.isIntroRevealActive = this.shouldPlayIntroReveal && !reducedMotion;
    this.introRevealElapsed = 0;
    this.introRevealProgress = this.shouldPlayIntroReveal && !reducedMotion ? 0 : 1;
    this.fogCanvas = document.createElement("canvas");
    this.fogContext = this.fogCanvas.getContext("2d");

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
      const [
        map, playerDown, playerUp, playerLeft, playerRight, monster, monsterDefeat, mimic, barrier, computer,
        earbuds, principalIdle, principalSuspicious, principalAlert, sofa,
        pianoTopLeft, pianoTopRight, pianoBottomLeft, pianoBottomRight, pianoAttack, siren, sirenAttack, musicRoomBeam,
        ...vases
      ] = await Promise.all([
        loadImage(this.config.assets.map),
        loadImage(this.config.assets.player.down),
        loadImage(this.config.assets.player.up),
        loadImage(this.config.assets.player.left),
        loadImage(this.config.assets.player.right),
        loadImage(this.config.assets.monster),
        loadImage(this.config.assets.monsterDefeat),
        loadImage(this.config.assets.mimic),
        loadImage(this.config.assets.barrier),
        loadImage(this.config.assets.computer),
        loadImage(this.config.assets.earbuds),
        loadImage(this.config.assets.office.principalIdle),
        loadImage(this.config.assets.office.principalSuspicious),
        loadImage(this.config.assets.office.principalAlert),
        loadImage(this.config.assets.office.sofa),
        loadImage(this.config.assets.musicRoom.pianoTopLeft),
        loadImage(this.config.assets.musicRoom.pianoTopRight),
        loadImage(this.config.assets.musicRoom.pianoBottomLeft),
        loadImage(this.config.assets.musicRoom.pianoBottomRight),
        loadImage(this.config.assets.musicRoom.pianoAttack),
        loadImage(this.config.assets.musicRoom.siren),
        loadImage(this.config.assets.musicRoom.sirenAttack),
        loadImage(this.config.assets.musicRoom.beam),
        ...this.config.assets.office.vases.map((source) => loadImage(source)),
      ]);

      this.images = {
        map,
        monster,
        monsterDefeat,
        mimic,
        barrier,
        computer,
        earbuds,
        office: { principalIdle, principalSuspicious, principalAlert, sofa, vases },
        musicRoom: {
          pianoTopLeft, pianoTopRight, pianoBottomLeft, pianoBottomRight, pianoAttack, siren, sirenAttack, beam: musicRoomBeam,
        },
        player: { down: playerDown, up: playerUp, left: playerLeft, right: playerRight },
      };
      this.prepareMapCollision();
      this.loadingMessage.hidden = true;
      this.state.isRunning = true;
      this.onReady?.();
      if (this.shouldPlayIntroReveal && !this.isIntroRevealActive) {
        this.isInputLocked = false;
        this.onIntroRevealEnd?.();
      }
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
    if (this.state.isPaused || this.isInputLocked) {
      return;
    }
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
    if (this.state.isPaused || this.isInputLocked) {
      return;
    }
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
    this.fogCanvas.width = width;
    this.fogCanvas.height = height;
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

  setPaused(isPaused) {
    if (this.state.isPaused === isPaused) {
      return;
    }

    this.state.isPaused = isPaused;
    this.canvas.dataset.paused = String(isPaused);
    this.clearAllInput();
    this.previousTimestamp = null;

    if (isPaused && this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    } else if (!isPaused && this.state.isRunning && this.animationFrameId === null) {
      this.animationFrameId = requestAnimationFrame(this.tick);
    }
  }

  prepareMapCollision() {
    this.walkableTiles = createWalkableTileMap(this.config.collision.walkableTiles);
  }

  isWalkablePixel(x, y) {
    const pixelX = Math.floor(x);
    const pixelY = Math.floor(y);
    if (pixelX < 0 || pixelY < 0 || pixelX >= this.config.world.width || pixelY >= this.config.world.height) {
      return false;
    }

    const tileSize = this.config.collision.tileSize;
    const tileX = Math.floor(pixelX / tileSize);
    const tileY = Math.floor(pixelY / tileSize);
    return this.walkableTiles.data[tileY * this.walkableTiles.columns + tileX] === 1;
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

  getBarrierCollisionBox() {
    return this.config.barrier;
  }

  getSofaCollisionBox() {
    const sofa = this.config.office.sofa;
    return {
      x: sofa.x + 8,
      y: sofa.y + 28,
      width: sofa.width - 16,
      height: sofa.height - 28,
    };
  }

  getPianoCollisionBox(piano) {
    const inset = 16;
    const size = this.config.musicRoom.pianoSize;
    return {
      x: piano.x + inset,
      y: piano.y + inset,
      width: size - inset * 2,
      height: size - inset * 2,
    };
  }

  getPlayerFootPoint() {
    const player = this.state.player;
    return { x: player.x + player.size / 2, y: player.y + player.size - this.config.player.footInsetY };
  }

  isPlayerInside(box) {
    const point = this.getPlayerFootPoint();
    return (
      point.x >= box.x
      && point.x <= box.x + box.width
      && point.y >= box.y
      && point.y <= box.y + box.height
    );
  }

  updatePrincipal(deltaSeconds) {
    const office = this.config.office;
    const wasInOffice = this.isInOffice;
    this.isInOffice = this.isPlayerInside(office.bounds);
    const revealDirection = this.isInOffice ? 1 : -1;
    this.officeRevealProgress = clampToRange(
      this.officeRevealProgress + (deltaSeconds / office.revealDuration) * revealDirection,
      0,
      1,
    );

    if (!this.isInOffice) {
      this.principalElapsedSeconds = 0;
      this.isInPrincipalDanger = false;
      if (wasInOffice && this.principalState !== "seated") {
        this.principalState = "seated";
        this.onPrincipalStateChange?.(this.principalState);
      }
      return;
    }

    this.principalElapsedSeconds += deltaSeconds;
    const nextState = getPrincipalState(this.principalElapsedSeconds, office.principalTiming);
    if (nextState !== this.principalState) {
      this.principalState = nextState;
      this.onPrincipalStateChange?.(this.principalState);
    }

    this.isInPrincipalDanger = this.principalState === "alert" && !this.isPlayerInside(office.safeZone);
    if (this.isInPrincipalDanger) {
      this.takeDamage(office.alertDamagePerSecond * deltaSeconds);
    }
  }

  takeDamage(amount) {
    const previousHp = this.state.stats.hp;
    applyHpDelta(this.state.stats, -amount);
    if (this.state.stats.hp < previousHp && this.damageFeedbackCooldown <= 0) {
      this.onDamage?.();
      this.damageFeedbackCooldown = 0.32;
    }
    if (!this.playerDefeated && isHpDepleted(this.state.stats)) {
      this.playerDefeated = true;
      this.state.isRunning = false;
      this.clearAllInput();
      this.onPlayerDeath?.();
    }
  }

  triggerVaseAttack() {
    this.vaseAttack.triggered = true;
    this.onHazardTriggered?.("officeVaseAttack");
  }

  setPuzzleSolved() {
    if (this.puzzleSolved) {
      return;
    }

    this.puzzleSolved = true;
    this.onHazardTriggered?.("officePuzzleSolved");
  }

  get isSirenFightActive() {
    return this.sirenFight.isActive;
  }

  isBoxInsideSirenArena(box) {
    const arena = this.config.musicRoom.fight.arena;
    return box.x >= arena.x
      && box.y >= arena.y
      && box.x + box.width <= arena.x + arena.width
      && box.y + box.height <= arena.y + arena.height;
  }

  // Deliberately the whole collision box, not the foot point: the fight seals
  // the room, so starting it while the player still straddles the doorway
  // would leave every candidate position rejected and freeze them in place.
  isPlayerInSirenArena() {
    return this.isBoxInsideSirenArena(
      this.getPlayerCollisionBox(this.state.player.x, this.state.player.y),
    );
  }

  updateSirenFight(deltaSeconds) {
    if (this.sirenFightCleared) {
      return;
    }

    if (!this.sirenFight.isActive && !this.sirenFightArmed) {
      if (this.isPlayerInSirenArena()) {
        this.sirenFightArmed = true;
        this.onSirenFightTrigger?.();
      }
      return;
    }

    if (!this.sirenFight.isActive) {
      return;
    }

    const player = this.state.player;
    this.sirenFight.update(
      deltaSeconds,
      this.getPlayerCollisionBox(player.x, player.y),
      { x: player.x + player.size / 2, y: player.y + player.size / 2 },
    );
  }

  // Called by the scene once the intro dialogue has been read.
  startSirenFight() {
    if (this.sirenFightCleared || this.sirenFight.isActive) {
      return;
    }

    const start = this.config.musicRoom.fight.playerStart;
    this.state.player.x = start.x;
    this.state.player.y = start.y;
    this.state.player.facing = start.facing ?? this.state.player.facing;
    this.clearAllInput();
    this.sirenFightArmed = true;
    this.sirenFight.start();
  }

  // Called by the scene once a mid-fight dialogue choice has been picked.
  resumeSirenFight(effect) {
    this.sirenFight.resumeFromDialogue(effect ?? {});
  }

  handleSirenFightEnd(hasWon) {
    if (hasWon) {
      this.sirenFightCleared = true;
    } else {
      // Losing pushes the player back into the corridor so re-entering the
      // room starts the fight over (same retry loop as a failed battle).
      const retreat = this.config.musicRoom.fight.retreat;
      this.state.player.x = retreat.x;
      this.state.player.y = retreat.y;
      this.sirenFightArmed = false;
    }
    this.clearAllInput();
    this.onSirenFightEnd?.(hasWon);
  }

  updateComputerInteraction() {
    if (this.puzzleSolved) {
      this.isNearComputer = false;
      return;
    }

    const computer = this.config.computer;
    const computerBox = { x: computer.x, y: computer.y, width: computer.size, height: computer.size };
    const playerBox = this.getPlayerCollisionBox(this.state.player.x, this.state.player.y);
    const isOverlapping = rectanglesOverlap(playerBox, computerBox);

    if (isOverlapping && !this.isNearComputer) {
      this.onComputerInteract?.();
    }

    this.isNearComputer = isOverlapping;
  }

  launchVaseAttack() {
    const attack = this.config.office.vaseAttack;
    const sourceIndex = attack.sourceVaseIndexes[this.vaseAttack.nextShot];
    const source = this.config.office.vases[sourceIndex];
    const sourceCenterX = source.x + source.size / 2;
    const sourceCenterY = source.y + source.size / 2;

    this.vaseAttack.droppedVaseIndexes.add(sourceIndex);
    this.vaseAttack.projectiles.push({
      sourceIndex,
      x: sourceCenterX,
      y: sourceCenterY,
      velocityY: attack.fallSpeed,
    });
    this.vaseAttack.nextShot += 1;
    this.vaseAttack.shotDelay = attack.shotDelay;
  }

  updateOfficeHazards(deltaSeconds) {
    const footPoint = this.getPlayerFootPoint();
    this.updatePrincipal(deltaSeconds);

    const attack = this.config.office.vaseAttack;
    const trigger = attack.trigger;
    if (
      !this.vaseAttack.triggered
      && footPoint.x >= trigger.x
      && footPoint.x <= trigger.x + trigger.width
      && footPoint.y >= trigger.y
      && footPoint.y <= trigger.y + trigger.height
    ) {
      this.triggerVaseAttack();
    }

    if (this.vaseAttack.triggered && this.vaseAttack.nextShot < attack.sourceVaseIndexes.length) {
      this.vaseAttack.shotDelay -= deltaSeconds;
      if (this.vaseAttack.shotDelay <= 0) {
        this.launchVaseAttack();
      }
    }

    const size = attack.projectileSize;
    this.vaseAttack.projectiles = this.vaseAttack.projectiles.filter((projectile) => {
      projectile.y += projectile.velocityY * deltaSeconds;
      const projectileBox = {
        x: projectile.x - size / 2,
        y: projectile.y - size / 2,
        width: size,
        height: size,
      };

      if (rectanglesOverlap(this.getPlayerCollisionBox(this.state.player.x, this.state.player.y), projectileBox)) {
        this.takeDamage(attack.damage);
        return false;
      }

      return projectile.y <= this.config.world.height + size;
    });
  }

  isWithinVision(x, y, width, height) {
    const player = this.state.player;
    const centerX = player.x + player.size / 2;
    const centerY = player.y + player.size / 2;
    const closestX = Math.min(Math.max(centerX, x), x + width);
    const closestY = Math.min(Math.max(centerY, y), y + height);
    const dx = centerX - closestX;
    const dy = centerY - closestY;
    return dx * dx + dy * dy <= this.visionRadius * this.visionRadius;
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
    if (!this.puzzleSolved && rectanglesOverlap(playerBox, this.getBarrierCollisionBox())) {
      return false;
    }
    if (rectanglesOverlap(playerBox, this.config.mimicRoomBarrier)) {
      return false;
    }
    if (rectanglesOverlap(playerBox, this.getSofaCollisionBox())) {
      return false;
    }
    if (this.config.musicRoom.pianos.some((piano) => (
      rectanglesOverlap(playerBox, this.getPianoCollisionBox(piano))
    ))) {
      return false;
    }

    // The music room seals shut for the duration of the siren fight - you
    // can't walk out of a boss room mid-fight. The seal only applies while the
    // player is already inside it, so nothing can strand them outside with
    // every direction blocked.
    if (
      this.sirenFight.isActive
      && !this.isBoxInsideSirenArena(playerBox)
      && this.isPlayerInSirenArena()
    ) {
      return false;
    }

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
    if (this.isIntroRevealActive) {
      this.introRevealElapsed += deltaSeconds;
      const duration = this.config.camera.introRevealSeconds;
      this.introRevealProgress = Math.min(1, this.introRevealElapsed / duration);
      if (this.introRevealProgress >= 1) {
        this.isIntroRevealActive = false;
        this.isInputLocked = false;
        this.onIntroRevealEnd?.();
      }
      return;
    }

    this.damageFeedbackCooldown = Math.max(0, this.damageFeedbackCooldown - deltaSeconds);
    if (this.defeatAnimation) {
      this.defeatAnimation.elapsedSeconds += deltaSeconds;
      const duration = this.config.monsterDefeat.frameCount * this.config.monsterDefeat.frameDuration;
      if (this.defeatAnimation.elapsedSeconds >= duration) {
        this.defeatAnimation = null;
        this.onDefeatAnimationEnd?.();
      }
    }

    const movement = getMovementVector(this.state.input);
    const isMoving = movement.x !== 0 || movement.y !== 0;
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
    this.updateOfficeHazards(deltaSeconds);
    this.updateComputerInteraction();
    this.updateSirenFight(deltaSeconds);

    if (isMoving) {
      this.playerAnimationElapsed += deltaSeconds;
      if (this.playerAnimationElapsed >= this.config.player.animationFrameDuration) {
        const advancedFrames = Math.floor(
          this.playerAnimationElapsed / this.config.player.animationFrameDuration,
        );
        this.playerAnimationFrame = (
          this.playerAnimationFrame + advancedFrames
        ) % this.config.player.animationFrameCount;
        this.playerAnimationElapsed %= this.config.player.animationFrameDuration;
      }
    } else {
      this.playerAnimationFrame = 0;
      this.playerAnimationElapsed = 0;
    }

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

    this.updateCamera(deltaSeconds);
  }

  updateCamera(deltaSeconds) {
    const targetCamera = getCameraPosition(this.state.player, this.config, this.viewport);

    if (!this.smoothCamera) {
      this.smoothCamera = { zoom: targetCamera.zoom, x: targetCamera.x, y: targetCamera.y, room: targetCamera.room };
      return;
    }

    const smoothing = 1 - Math.exp(-deltaSeconds / CAMERA_SMOOTHING_TIME_CONSTANT);
    this.smoothCamera.zoom += (targetCamera.zoom - this.smoothCamera.zoom) * smoothing;
    this.smoothCamera.x += (targetCamera.x - this.smoothCamera.x) * smoothing;
    this.smoothCamera.y += (targetCamera.y - this.smoothCamera.y) * smoothing;
    this.smoothCamera.room = targetCamera.room;
  }

  render() {
    const { width, height } = this.viewport;
    const player = this.state.player;
    const isIntroRevealing = this.introRevealProgress < 1;
    const introEasedProgress = 1 - ((1 - this.introRevealProgress) ** 3);
    const introZoom = this.config.camera.introZoom
      + (this.config.camera.zoom - this.config.camera.introZoom) * introEasedProgress;
    const camera = isIntroRevealing
      ? getCameraPosition(player, this.config, this.viewport, introZoom)
      : (this.smoothCamera ?? getCameraPosition(player, this.config, this.viewport));
    const zoom = camera.zoom;
    const activeRoom = camera.room;
    const roomFogDisabled = !isIntroRevealing && Boolean(activeRoom?.disableFog);
    const fogOpacity = isIntroRevealing ? 1 : 1 - this.officeRevealProgress;
    const isVisible = (x, y, w, h) => {
      if (this.officeRevealProgress > 0) {
        return rectanglesOverlap(this.config.office.bounds, { x, y, width: w, height: h });
      }
      if (roomFogDisabled) {
        return rectanglesOverlap(activeRoom, { x, y, width: w, height: h });
      }
      return this.isWithinVision(x, y, w, h);
    };
    const mapWidth = Math.min(width / zoom, this.config.world.width);
    const mapHeight = Math.min(height / zoom, this.config.world.height);
    const toScreenX = (x) => (x - camera.x) * zoom;
    const toScreenY = (y) => (y - camera.y) * zoom;
    const toScreenSize = (size) => size * zoom;

    this.context.fillStyle = "#ffffff";
    this.context.fillRect(0, 0, width, height);
    const mapCrop = this.config.mapCrop;
    this.context.drawImage(
      this.images.map,
      mapCrop.x + camera.x,
      mapCrop.y + camera.y,
      mapWidth,
      mapHeight,
      0,
      0,
      width,
      height,
    );

    if (this.config.goal && isVisible(this.config.goal.x, this.config.goal.y, this.config.goal.size, this.config.goal.size)) {
      const goal = this.config.goal;
      this.context.fillStyle = "rgba(120, 220, 255, 0.35)";
      this.context.fillRect(toScreenX(goal.x), toScreenY(goal.y), toScreenSize(goal.size), toScreenSize(goal.size));
      this.context.strokeStyle = "#78dcff";
      this.context.lineWidth = 2;
      this.context.strokeRect(toScreenX(goal.x), toScreenY(goal.y), toScreenSize(goal.size), toScreenSize(goal.size));
    }

    for (const pickup of this.state.pickups) {
      if (!pickup.enabled || !isVisible(pickup.x, pickup.y, pickup.size, pickup.size)) {
        continue;
      }

      this.context.drawImage(
        this.images.earbuds,
        toScreenX(pickup.x),
        toScreenY(pickup.y),
        toScreenSize(pickup.size),
        toScreenSize(pickup.size),
      );
    }

    for (const encounter of this.state.encounters) {
      if (
        !encounter.enabled
        || encounter.skipDefaultRender
        || !isVisible(encounter.x, encounter.y, encounter.size, encounter.size)
      ) {
        continue;
      }
      // The siren has its own dedicated decoration sprite drawn later
      // alongside the rest of the music room (see musicRoom.siren below) -
      // skip the generic shadow-monster silhouette here so it doesn't show
      // through any transparent padding on that sprite.
      if (encounter.id === "musicRoomSiren") {
        continue;
      }

      this.context.drawImage(
        this.images.monster,
        toScreenX(encounter.x),
        toScreenY(encounter.y),
        toScreenSize(encounter.size),
        toScreenSize(encounter.size),
      );
    }

    if (this.defeatAnimation && isVisible(
      this.defeatAnimation.x,
      this.defeatAnimation.y,
      this.defeatAnimation.size,
      this.defeatAnimation.size,
    )) {
      const { frameCount, frameDuration } = this.config.monsterDefeat;
      const sprite = this.images.monsterDefeat;
      const sourceWidth = sprite.width / frameCount;
      const frame = Math.min(
        frameCount - 1,
        Math.floor(this.defeatAnimation.elapsedSeconds / frameDuration),
      );

      this.context.drawImage(
        sprite,
        frame * sourceWidth,
        0,
        sourceWidth,
        sprite.height,
        toScreenX(this.defeatAnimation.x),
        toScreenY(this.defeatAnimation.y),
        toScreenSize(this.defeatAnimation.size),
        toScreenSize(this.defeatAnimation.size),
      );
    }

    const mimic = this.config.mimic;
    const mimicEncounter = this.state.encounters.find((encounter) => encounter.id === "mimicBox");
    if (
      (!mimicEncounter || mimicEncounter.enabled)
      && isVisible(mimic.x, mimic.y, mimic.size, mimic.size)
    ) {
      this.context.drawImage(
        this.images.mimic,
        toScreenX(mimic.x),
        toScreenY(mimic.y),
        toScreenSize(mimic.size),
        toScreenSize(mimic.size),
      );
    }

    const barrier = this.config.barrier;
    if (!this.puzzleSolved && isVisible(barrier.x, barrier.y, barrier.width, barrier.height)) {
      this.context.drawImage(
        this.images.barrier,
        toScreenX(barrier.x),
        toScreenY(barrier.y),
        toScreenSize(barrier.width),
        toScreenSize(barrier.height),
      );
    }

    const mimicRoomBarrier = this.config.mimicRoomBarrier;
    if (isVisible(mimicRoomBarrier.x, mimicRoomBarrier.y, mimicRoomBarrier.width, mimicRoomBarrier.height)) {
      this.context.drawImage(
        this.images.barrier,
        toScreenX(mimicRoomBarrier.x),
        toScreenY(mimicRoomBarrier.y),
        toScreenSize(mimicRoomBarrier.width),
        toScreenSize(mimicRoomBarrier.height),
      );
    }

    const computer = this.config.computer;
    if (isVisible(computer.x, computer.y, computer.size, computer.size)) {
      this.context.drawImage(
        this.images.computer,
        toScreenX(computer.x),
        toScreenY(computer.y),
        toScreenSize(computer.size),
        toScreenSize(computer.size),
      );
    }

    const office = this.config.office;
    if (isVisible(office.sofa.x, office.sofa.y, office.sofa.width, office.sofa.height)) {
      this.context.drawImage(
        this.images.office.sofa,
        toScreenX(office.sofa.x),
        toScreenY(office.sofa.y),
        toScreenSize(office.sofa.width),
        toScreenSize(office.sofa.height),
      );
    }

    if (isVisible(office.principal.x, office.principal.y, office.principal.size, office.principal.size)) {
      const principalImage = {
        seated: this.images.office.principalIdle,
        suspicious: this.images.office.principalSuspicious,
        alert: this.images.office.principalAlert,
      }[this.principalState];
      this.context.drawImage(
        principalImage,
        toScreenX(office.principal.x),
        toScreenY(office.principal.y),
        toScreenSize(office.principal.size),
        toScreenSize(office.principal.size),
      );
    }

    for (const [index, vase] of office.vases.entries()) {
      if (this.vaseAttack.droppedVaseIndexes.has(index)) {
        continue;
      }
      if (!isVisible(vase.x, vase.y, vase.size, vase.size)) {
        continue;
      }

      this.context.drawImage(
        this.images.office.vases[index],
        toScreenX(vase.x),
        toScreenY(vase.y),
        toScreenSize(vase.size),
        toScreenSize(vase.size),
      );
    }

    for (const projectile of this.vaseAttack.projectiles) {
      if (!isVisible(projectile.x - 20, projectile.y - 20, 40, 40)) {
        continue;
      }

      const size = toScreenSize(this.config.office.vaseAttack.projectileSize);
      this.context.save();
      this.context.translate(toScreenX(projectile.x), toScreenY(projectile.y));
      this.context.rotate(Math.PI);
      this.context.drawImage(this.images.office.vases[projectile.sourceIndex], -size / 2, -size / 2, size, size);
      this.context.restore();
    }

    const musicRoom = this.config.musicRoom;
    const pianoSize = musicRoom.pianoSize;
    const sirenCenterX = musicRoom.siren.x + musicRoom.siren.size / 2;
    const sirenCenterY = musicRoom.siren.y + musicRoom.siren.size / 2;
    musicRoom.pianos.forEach((piano, index) => {
      if (!isVisible(piano.x, piano.y, pianoSize, pianoSize)) {
        return;
      }

      const attackFrame = this.sirenFight.isActive
        ? this.sirenFight.getPianoAttackFrame(index)
        : null;
      const attackStrip = this.images.musicRoom.pianoAttack;

      if (attackFrame === null || !attackStrip) {
        this.context.drawImage(
          this.images.musicRoom[piano.corner],
          toScreenX(piano.x),
          toScreenY(piano.y),
          toScreenSize(pianoSize),
          toScreenSize(pianoSize),
        );
        return;
      }

      // 피아노_입벌림 is drawn front-on (keyboard/mouth pointing down) in a
      // single orientation, while each corner's idle sprite is pre-rotated to
      // open toward the room's center. Rotate the attack pose the same way so
      // the mouth keeps facing the middle of the room when it fires.
      const centerX = piano.x + pianoSize / 2;
      const centerY = piano.y + pianoSize / 2;
      const angle = Math.atan2(sirenCenterY - centerY, sirenCenterX - centerX) - Math.PI / 2;
      const frameCount = 2;
      const frameWidth = attackStrip.width / frameCount;
      const screenSize = toScreenSize(pianoSize);

      this.context.save();
      this.context.translate(toScreenX(centerX), toScreenY(centerY));
      this.context.rotate(angle);
      this.context.drawImage(
        attackStrip,
        attackFrame * frameWidth,
        0,
        frameWidth,
        attackStrip.height,
        -screenSize / 2,
        -screenSize / 2,
        screenSize,
        screenSize,
      );
      this.context.restore();
    });

    // The ambient trails are the siren's power feeding off the pianos - once
    // it's beaten the room goes quiet, and during the fight the same sprite is
    // busy flying at the player as live bolts instead.
    if (!this.sirenFightCleared && !this.sirenFight.isActive) {
      for (const trail of musicRoom.beamTrails) {
        const trailSize = musicRoom.beamFrameSize;
        if (!isVisible(trail.x - trailSize / 2, trail.y - trailSize / 2, trailSize, trailSize)) {
          continue;
        }

        const strip = this.images.musicRoom.beam;
        const frameWidth = strip.width / 4;
        this.context.drawImage(
          strip,
          trail.frame * frameWidth,
          0,
          frameWidth,
          strip.height,
          toScreenX(trail.x - trailSize / 2),
          toScreenY(trail.y - trailSize / 2),
          toScreenSize(trailSize),
          toScreenSize(trailSize),
        );
      }
    }

    this.sirenFight.renderProjectiles(this.context, this.images.musicRoom.beam, {
      toScreenX,
      toScreenY,
      toScreenSize,
    });

    if (
      !this.sirenFightCleared
      && isVisible(musicRoom.siren.x, musicRoom.siren.y, musicRoom.siren.size, musicRoom.siren.size)
    ) {
      const isStunned = this.sirenFight.isSirenStunned;
      const attackStrip = this.images.musicRoom.sirenAttack;
      if (isStunned && attackStrip) {
        const frameCount = 4;
        const frameWidth = attackStrip.width / frameCount;
        const frame = Math.floor(this.sirenFight.phaseElapsed / 0.09) % frameCount;
        this.context.drawImage(
          attackStrip,
          frame * frameWidth,
          0,
          frameWidth,
          attackStrip.height,
          toScreenX(musicRoom.siren.x),
          toScreenY(musicRoom.siren.y),
          toScreenSize(musicRoom.siren.size),
          toScreenSize(musicRoom.siren.size),
        );
      } else {
        this.context.drawImage(
          this.images.musicRoom.siren,
          toScreenX(musicRoom.siren.x),
          toScreenY(musicRoom.siren.y),
          toScreenSize(musicRoom.siren.size),
          toScreenSize(musicRoom.siren.size),
        );
      }

      this.sirenFight.renderStunRing(this.context, { toScreenX, toScreenY, toScreenSize });
    }

    const playerSprite = this.images.player[player.facing];
    const sourceSize = playerSprite.height;
    this.context.drawImage(
      playerSprite,
      this.playerAnimationFrame * sourceSize,
      0,
      sourceSize,
      sourceSize,
      toScreenX(player.x),
      toScreenY(player.y),
      toScreenSize(player.size),
      toScreenSize(player.size),
    );

    if (!roomFogDisabled && fogOpacity > 0) {
      this.renderFogOfWar(
        toScreenX,
        toScreenY,
        player.x + player.size / 2,
        player.y + player.size / 2,
        zoom,
        fogOpacity,
        isIntroRevealing ? introEasedProgress : 1,
      );
    }

    this.canvas.dataset.playerX = player.x.toFixed(2);
    this.canvas.dataset.playerY = player.y.toFixed(2);
    this.canvas.dataset.cameraX = camera.x.toFixed(2);
    this.canvas.dataset.cameraY = camera.y.toFixed(2);
    this.canvas.dataset.cameraZoom = camera.zoom.toFixed(2);
    this.canvas.dataset.introRevealProgress = this.introRevealProgress.toFixed(3);
  }

  renderFogOfWar(toScreenX, toScreenY, playerCenterX, playerCenterY, zoom, opacity = 1, radiusScale = 1) {
    const { width, height } = this.viewport;
    const screenRadius = this.visionRadius * zoom * radiusScale;
    const visionHeight = screenRadius * 2;
    const visionWidth = visionHeight * (16 / 9);
    const screenCenterX = toScreenX(playerCenterX);
    const screenCenterY = toScreenY(playerCenterY);
    const fogCtx = this.fogContext;
    const fogAlpha = opacity * (1 - 0.1 * radiusScale);
    const fogColor = `rgba(4, 6, 8, ${fogAlpha})`;

    fogCtx.clearRect(0, 0, width, height);
    fogCtx.fillStyle = fogColor;
    fogCtx.fillRect(0, 0, width, height);

    fogCtx.save();
    fogCtx.filter = "blur(16px)";
    fogCtx.globalCompositeOperation = "destination-out";
    fogCtx.fillStyle = "rgba(0, 0, 0, 1)";
    fogCtx.fillRect(
      screenCenterX - visionWidth / 2,
      screenCenterY - visionHeight / 2,
      visionWidth,
      visionHeight,
    );
    fogCtx.restore();

    this.context.drawImage(this.fogCanvas, 0, 0);
  }

  tick(timestamp) {
    this.animationFrameId = null;
    if (!this.state.isRunning) {
      return;
    }

    if (this.state.isPaused) {
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
