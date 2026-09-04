// In-world siren boss fight for the music room.
//
// This owns only the fight's own state - rounds, projectiles, the stun window
// and the counterattack. It runs inside the exploration scene on the real
// room floor, so the player is the ordinary overworld character: movement,
// collision and damage all stay with GameController, which drives this class
// from its update/render loop and relays the callbacks to the scene.

const PIANO_CENTER_OFFSET = 0.5;

function rectanglesOverlap(a, b) {
  return (
    a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y
  );
}

export class SirenFight {
  constructor({ config, onDamage, onSirenHit, onDialogue, onFinish, onUpdate }) {
    this.config = config;
    this.settings = config.musicRoom.fight;
    this.onDamage = onDamage;
    this.onSirenHit = onSirenHit;
    this.onDialogue = onDialogue;
    this.onFinish = onFinish;
    this.onUpdate = onUpdate;

    this.phase = "idle"; // idle | dodge | stun | hitPause | dialogue | done
    this.roundIndex = 0;
    this.phaseElapsed = 0;
    this.spawnTimer = 0;
    this.spawnTick = 0;
    this.projectiles = [];
    this.sirenHp = this.settings.sirenHp;
    this.speedFactor = 1;
    this.counterFlashElapsed = 0;
    this.pendingDialogueId = null;
    this.pianoAttackTimers = config.musicRoom.pianos.map(() => 0);
  }

  get isActive() {
    return this.phase !== "idle" && this.phase !== "done";
  }

  // The scene pauses the whole controller while a dialogue is open, so this is
  // only used to keep the fight from re-arming its trigger in the meantime.
  get isAwaitingDialogue() {
    return this.phase === "dialogue";
  }

  get isSirenStunned() {
    return this.phase === "stun" || this.phase === "hitPause";
  }

  get snapshot() {
    return {
      active: this.isActive,
      phase: this.phase,
      round: this.roundIndex + 1,
      totalRounds: this.settings.rounds.length,
      sirenHp: this.sirenHp,
      sirenHpMax: this.settings.sirenHp,
      prompt: this.phase === "stun" ? "지금이다! 세이렌에게 부딪혀라!" : null,
    };
  }

  start() {
    this.phase = "dodge";
    this.roundIndex = 0;
    this.phaseElapsed = 0;
    this.spawnTimer = 0;
    this.spawnTick = 0;
    this.projectiles = [];
    this.sirenHp = this.settings.sirenHp;
    this.speedFactor = 1;
    this.counterFlashElapsed = 0;
    this.pendingDialogueId = null;
    this.pianoAttackTimers = this.pianoAttackTimers.map(() => 0);
    this.onUpdate?.(this.snapshot);
  }

  stop() {
    this.phase = "done";
    this.projectiles = [];
    this.onUpdate?.(this.snapshot);
  }

  getPianoCenters() {
    const { pianos, pianoSize } = this.config.musicRoom;
    return pianos.map((piano) => ({
      x: piano.x + pianoSize * PIANO_CENTER_OFFSET,
      y: piano.y + pianoSize * PIANO_CENTER_OFFSET,
    }));
  }

  getSirenBox() {
    const siren = this.config.musicRoom.siren;
    return { x: siren.x, y: siren.y, width: siren.size, height: siren.size };
  }

  spawnWave(playerCenter) {
    const round = this.settings.rounds[this.roundIndex];
    const centers = this.getPianoCenters();
    const speed = round.projectileSpeed * this.speedFactor;

    const sourceIndexes = round.pattern === "single"
      ? [this.spawnTick % centers.length]
      : round.pattern === "pair"
        ? (this.spawnTick % 2 === 0 ? [0, 3] : [1, 2])
        : centers.map((_, index) => index);

    for (const index of sourceIndexes) {
      const source = centers[index];
      const dx = playerCenter.x - source.x;
      const dy = playerCenter.y - source.y;
      const length = Math.hypot(dx, dy) || 1;
      this.projectiles.push({
        x: source.x,
        y: source.y,
        vx: (dx / length) * speed,
        vy: (dy / length) * speed,
        age: 0,
      });
      // The piano that fired opens its lid like a mouth for a beat.
      this.pianoAttackTimers[index] = this.settings.pianoAttackPoseSeconds;
    }

    this.spawnTick += 1;
  }

  // null while idle, otherwise the frame index of 피아노_입벌림 to draw.
  getPianoAttackFrame(pianoIndex) {
    const remaining = this.pianoAttackTimers[pianoIndex] ?? 0;
    if (remaining <= 0) {
      return null;
    }
    const total = this.settings.pianoAttackPoseSeconds;
    return remaining > total * 0.4 ? 1 : 0;
  }

  updateProjectiles(deltaSeconds, playerBox) {
    const hitSize = this.settings.projectileHitSize;
    const arena = this.settings.arena;

    this.projectiles = this.projectiles.filter((projectile) => {
      projectile.x += projectile.vx * deltaSeconds;
      projectile.y += projectile.vy * deltaSeconds;
      projectile.age += deltaSeconds;

      const hitBox = {
        x: projectile.x - hitSize / 2,
        y: projectile.y - hitSize / 2,
        width: hitSize,
        height: hitSize,
      };

      if (rectanglesOverlap(playerBox, hitBox)) {
        this.onDamage?.(this.settings.hitDamage);
        return false;
      }

      // Bolts are aimed at the player inside a sealed room, so anything that
      // leaves the arena has already missed - drop it instead of tracking it
      // across the rest of the map.
      const margin = this.settings.projectileSize;
      return projectile.x >= arena.x - margin
        && projectile.x <= arena.x + arena.width + margin
        && projectile.y >= arena.y - margin
        && projectile.y <= arena.y + arena.height + margin;
    });
  }

  updateDodge(deltaSeconds, playerBox, playerCenter) {
    const round = this.settings.rounds[this.roundIndex];

    this.pianoAttackTimers = this.pianoAttackTimers.map((remaining) => Math.max(0, remaining - deltaSeconds));

    this.spawnTimer += deltaSeconds;
    const interval = round.spawnIntervalSeconds / this.speedFactor;
    if (this.spawnTimer >= interval) {
      this.spawnTimer -= interval;
      this.spawnWave(playerCenter);
    }

    this.updateProjectiles(deltaSeconds, playerBox);

    this.phaseElapsed += deltaSeconds;
    if (this.phaseElapsed >= round.durationSeconds) {
      this.beginStun();
    }
  }

  beginStun() {
    this.phase = "stun";
    this.phaseElapsed = 0;
    this.projectiles = [];
    this.pianoAttackTimers = this.pianoAttackTimers.map(() => 0);
    this.onUpdate?.(this.snapshot);
  }

  updateStun(deltaSeconds) {
    this.phaseElapsed += deltaSeconds;

    if (this.phaseElapsed >= this.settings.stunSeconds) {
      this.advanceRound();
    }
  }

  // Called by the scene when the player presses the attack key. Only lands
  // while the siren is actually stunned and the player is close enough to
  // reach her - a whiffed press during the dodge phase (or from too far
  // away) does nothing.
  attack(playerBox) {
    if (this.phase !== "stun") {
      return false;
    }
    if (!rectanglesOverlap(playerBox, this.getSirenBox())) {
      return false;
    }

    this.landCounter();
    return true;
  }

  landCounter() {
    this.sirenHp = Math.max(0, this.sirenHp - 1);
    this.counterFlashElapsed = 0;
    this.phase = "hitPause";
    this.phaseElapsed = 0;
    this.onSirenHit?.(this.sirenHp);
    this.onUpdate?.(this.snapshot);
  }

  updateHitPause(deltaSeconds) {
    this.phaseElapsed += deltaSeconds;
    this.counterFlashElapsed += deltaSeconds;
    if (this.phaseElapsed < this.settings.hitPauseSeconds) {
      return;
    }

    if (this.sirenHp <= 0) {
      this.finish(true);
      return;
    }

    this.advanceRound();
  }

  advanceRound() {
    const round = this.settings.rounds[this.roundIndex];
    if (round.dialogueId) {
      this.pendingDialogueId = round.dialogueId;
      this.phase = "dialogue";
      this.projectiles = [];
      this.onUpdate?.(this.snapshot);
      this.onDialogue?.(round.dialogueId);
      return;
    }

    this.startNextRound();
  }

  startNextRound() {
    this.pendingDialogueId = null;
    if (this.roundIndex >= this.settings.rounds.length - 1) {
      this.finish(false);
      return;
    }

    this.roundIndex += 1;
    this.phase = "dodge";
    this.phaseElapsed = 0;
    this.spawnTimer = 0;
    this.spawnTick = 0;
    this.onUpdate?.(this.snapshot);
  }

  // Called by the scene once the player has picked an option in a mid-fight
  // dialogue. `speedFactor` lets a choice slow the siren down (or wind it up).
  resumeFromDialogue({ speedFactor } = {}) {
    if (this.phase !== "dialogue") {
      return;
    }

    if (typeof speedFactor === "number" && speedFactor > 0) {
      this.speedFactor = speedFactor;
    }
    this.startNextRound();
  }

  finish(hasWon) {
    this.phase = "done";
    this.projectiles = [];
    this.onUpdate?.(this.snapshot);
    this.onFinish?.(hasWon);
  }

  update(deltaSeconds, playerBox, playerCenter) {
    if (!this.isActive) {
      return;
    }

    if (this.phase === "dodge") {
      this.updateDodge(deltaSeconds, playerBox, playerCenter);
    } else if (this.phase === "stun") {
      this.updateStun(deltaSeconds);
    } else if (this.phase === "hitPause") {
      this.updateHitPause(deltaSeconds);
    }
  }

  renderProjectiles(context, beamSprite, { toScreenX, toScreenY, toScreenSize }) {
    if (!beamSprite || this.projectiles.length === 0) {
      return;
    }

    const size = this.settings.projectileSize;
    const frameCount = 4;
    const frameWidth = beamSprite.width / frameCount;

    for (const projectile of this.projectiles) {
      const frame = Math.min(frameCount - 1, Math.floor(projectile.age / 0.08));
      context.drawImage(
        beamSprite,
        frame * frameWidth,
        0,
        frameWidth,
        beamSprite.height,
        toScreenX(projectile.x - size / 2),
        toScreenY(projectile.y - size / 2),
        toScreenSize(size),
        toScreenSize(size),
      );
    }
  }

  renderStunRing(context, { toScreenX, toScreenY, toScreenSize }) {
    if (this.phase !== "stun") {
      return;
    }

    const siren = this.config.musicRoom.siren;
    const centerX = siren.x + siren.size / 2;
    const centerY = siren.y + siren.size / 2;
    const ratio = Math.max(0, 1 - this.phaseElapsed / this.settings.stunSeconds);

    context.save();
    context.strokeStyle = "#ffcf40";
    context.lineWidth = Math.max(2, toScreenSize(4));
    context.beginPath();
    context.arc(
      toScreenX(centerX),
      toScreenY(centerY),
      toScreenSize(siren.size * 0.55 + siren.size * 0.5 * ratio),
      0,
      Math.PI * 2,
    );
    context.stroke();
    context.restore();
  }

  // Expanding white shockwave + a couple of star bursts, shown for
  // counterFlashSeconds right after a landed hit (see landCounter()).
  renderHitBurst(context, { toScreenX, toScreenY, toScreenSize }) {
    if (this.phase !== "hitPause") {
      return;
    }

    const siren = this.config.musicRoom.siren;
    const centerX = siren.x + siren.size / 2;
    const centerY = siren.y + siren.size / 2;
    const ratio = Math.min(1, this.counterFlashElapsed / this.settings.counterFlashSeconds);
    const fade = Math.max(0, 1 - ratio);

    context.save();
    context.globalAlpha = fade;
    context.strokeStyle = "#ffffff";
    context.lineWidth = Math.max(2, toScreenSize(5));
    context.beginPath();
    context.arc(
      toScreenX(centerX),
      toScreenY(centerY),
      toScreenSize(siren.size * (0.35 + ratio * 0.55)),
      0,
      Math.PI * 2,
    );
    context.stroke();

    const sparkCount = 6;
    const sparkDistance = siren.size * (0.4 + ratio * 0.7);
    context.fillStyle = "#fff6c8";
    for (let i = 0; i < sparkCount; i += 1) {
      const angle = (Math.PI * 2 * i) / sparkCount;
      const sparkX = centerX + Math.cos(angle) * sparkDistance;
      const sparkY = centerY + Math.sin(angle) * sparkDistance;
      const sparkSize = toScreenSize(6 * fade);
      context.beginPath();
      context.arc(toScreenX(sparkX), toScreenY(sparkY), sparkSize, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  // Bright white flash on the siren sprite itself while she's reeling from a
  // landed hit, applied as a canvas filter around the caller's drawImage.
  get isFlashingFromHit() {
    return this.phase === "hitPause";
  }
}
