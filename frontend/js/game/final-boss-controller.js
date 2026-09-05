import { applyHpDelta } from "./game-state.js";

export const FINAL_BOSS_PHASE = Object.freeze({
  CHASE: 1,
  PROJECTILES: 2,
  OVERLOAD: 3,
  FINAL: 4,
  DEFEATED: 5,
});

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const PHASE_TIME_LIMITS = Object.freeze({
  [FINAL_BOSS_PHASE.PROJECTILES]: 15,
  [FINAL_BOSS_PHASE.OVERLOAD]: 20,
  [FINAL_BOSS_PHASE.FINAL]: 30,
});

export function circlesOverlap(a, b) {
  return distance(a, b) <= a.radius + b.radius;
}

export class FinalBossController {
  constructor({ canvas, config, stats, images, onDamage, onPhaseChange, onDefeat, onUpdate }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.config = config;
    this.stats = stats;
    this.images = images;
    this.onDamage = onDamage;
    this.onPhaseChange = onPhaseChange;
    this.onDefeat = onDefeat;
    this.onUpdate = onUpdate;
    this.keys = new Set();
    this.animationId = null;
    this.lastTime = 0;
    this.isPaused = false;
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.frame = this.frame.bind(this);
    this.reset();
  }

  reset() {
    const { width, height } = this.canvas;
    this.player = { x: width / 2, y: height - 72, radius: 17, speed: 235, invulnerable: 0, attackCooldown: 0, facing: "up", moving: false, animationTime: 0 };
    this.boss = { x: width / 2, y: 112, radius: 48, hp: 100, maxHp: 100, vulnerable: 0, state: "chase", timer: 1.8, target: null };
    this.phase = FINAL_BOSS_PHASE.CHASE;
    this.projectiles = [];
    this.waves = [];
    this.hazards = [];
    this.clones = [];
    this.patternIndex = 0;
    this.phaseHits = 0;
    this.phaseElapsed = 0;
    this.defeatTimer = 0;
    this.defeatNotified = false;
    this.keys.clear();
    this.onPhaseChange?.(this.phase);
    this.emitUpdate();
  }

  start() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame(this.frame);
  }

  destroy() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.keys.clear();
  }

  setPaused(paused) {
    this.isPaused = paused;
    this.keys.clear();
  }

  handleKeyDown(event) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
    if (this.isPaused) return;
    this.keys.add(event.code);
    if (["Space", "KeyE"].includes(event.code) && !event.repeat) this.attack();
  }

  handleKeyUp(event) {
    this.keys.delete(event.code);
  }

  frame(now) {
    const delta = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    if (!this.isPaused) this.update(delta);
    this.render();
    this.animationId = requestAnimationFrame(this.frame);
  }

  update(delta) {
    if (this.phase === FINAL_BOSS_PHASE.DEFEATED) {
      this.defeatTimer += delta;
      if (this.defeatTimer >= 2.2 && !this.defeatNotified) {
        this.defeatNotified = true;
        this.onDefeat?.();
      }
      return;
    }
    this.updatePlayer(delta);
    this.boss.timer -= delta;
    this.boss.vulnerable = Math.max(0, this.boss.vulnerable - delta);
    this.player.invulnerable = Math.max(0, this.player.invulnerable - delta);
    this.player.attackCooldown = Math.max(0, this.player.attackCooldown - delta);
    this.phaseElapsed += delta;
    if (this.advanceExpiredPhase()) {
      this.emitUpdate();
      return;
    }
    if (this.phase === 1) this.updatePhaseOne(delta);
    if (this.phase === 2) this.updatePhaseTwo(delta);
    if (this.phase === 3) this.updatePhaseThree(delta);
    if (this.phase === 4) this.updatePhaseFour(delta);
    this.updateProjectiles(delta);
    this.updateWaves(delta);
    this.updateHazards(delta);
    this.emitUpdate();
  }

  advanceExpiredPhase() {
    const limit = PHASE_TIME_LIMITS[this.phase];
    if (!limit || this.phaseElapsed < limit) return false;

    if (this.phase === FINAL_BOSS_PHASE.PROJECTILES) {
      this.boss.hp = Math.min(this.boss.hp, 50);
      this.changePhase(FINAL_BOSS_PHASE.OVERLOAD);
    } else if (this.phase === FINAL_BOSS_PHASE.OVERLOAD) {
      this.boss.hp = Math.min(this.boss.hp, 25);
      this.changePhase(FINAL_BOSS_PHASE.FINAL);
    } else if (this.phase === FINAL_BOSS_PHASE.FINAL) {
      this.boss.hp = 0;
      this.defeat();
    }
    return true;
  }

  updatePlayer(delta) {
    const left = this.keys.has("ArrowLeft") || this.keys.has("KeyA");
    const right = this.keys.has("ArrowRight") || this.keys.has("KeyD");
    const up = this.keys.has("ArrowUp") || this.keys.has("KeyW");
    const down = this.keys.has("ArrowDown") || this.keys.has("KeyS");
    let x = Number(right) - Number(left);
    let y = Number(down) - Number(up);
    this.player.moving = x !== 0 || y !== 0;
    if (this.player.moving) {
      if (Math.abs(x) >= Math.abs(y)) this.player.facing = x > 0 ? "right" : "left";
      else this.player.facing = y > 0 ? "down" : "up";
      this.player.animationTime += delta;
    }
    const length = Math.hypot(x, y) || 1;
    x /= length; y /= length;
    this.player.x = clamp(this.player.x + x * this.player.speed * delta, 30, this.canvas.width - 30);
    this.player.y = clamp(this.player.y + y * this.player.speed * delta, 62, this.canvas.height - 30);
  }

  updatePhaseOne(delta) {
    if (this.boss.state === "chase") {
      const dx = this.player.x - this.boss.x;
      const dy = this.player.y - this.boss.y;
      const length = Math.hypot(dx, dy) || 1;
      this.boss.x += dx / length * 78 * delta;
      this.boss.y += dy / length * 78 * delta;
      if (this.boss.timer <= 0) {
        this.boss.state = "telegraph";
        this.boss.timer = 0.9;
        this.boss.target = { x: dx / length, y: dy / length };
      }
    } else if (this.boss.state === "telegraph" && this.boss.timer <= 0) {
      this.boss.state = "charge";
      this.boss.timer = 1.15;
    } else if (this.boss.state === "charge") {
      this.boss.x += this.boss.target.x * 520 * delta;
      this.boss.y += this.boss.target.y * 520 * delta;
      const hitWall = this.boss.x < 50 || this.boss.x > this.canvas.width - 50 || this.boss.y < 75 || this.boss.y > this.canvas.height - 50;
      if (circlesOverlap(this.player, this.boss)) this.damagePlayer(14);
      if (hitWall || this.boss.timer <= 0) this.stunBoss(2.5);
    } else if (this.boss.state === "stunned" && this.boss.timer <= 0) {
      this.boss.state = "chase";
      this.boss.timer = 1.7;
    }
  }

  updatePhaseTwo() {
    this.moveBossToward(this.canvas.width / 2, 105, 2.5);
    if (this.boss.timer <= 0) {
      // Phase 2 is a short reflection tutorial: surface a readable counter
      // projectile every other volley instead of making the player wait
      // through two full normal spreads for each opening.
      const special = this.patternIndex % 2 === 1;
      this.fireAtPlayer(special, 185 + this.phaseHits * 8);
      if (!special) this.fireSpread(3, 150 + this.phaseHits * 6);
      this.patternIndex += 1;
      this.boss.timer = Math.max(0.65, 1.15 - this.phaseHits * 0.05);
    }
  }

  updatePhaseThree(delta) {
    if (this.boss.state === "stunned") {
      if (this.boss.timer <= 0) { this.boss.state = "pattern"; this.boss.timer = 0.7; }
      return;
    }
    if (this.boss.state === "charge") {
      this.boss.x += this.boss.target.x * 610 * delta;
      this.boss.y += this.boss.target.y * 610 * delta;
      if (circlesOverlap(this.player, this.boss)) this.damagePlayer(16);
      if (this.boss.timer <= 0 || this.boss.x < 45 || this.boss.x > this.canvas.width - 45 || this.boss.y < 70 || this.boss.y > this.canvas.height - 45) this.finishPattern();
      return;
    }
    if (this.boss.state === "telegraph") {
      if (this.boss.timer <= 0) {
        this.boss.state = "charge";
        this.boss.timer = 0.9;
      }
      return;
    }
    if (this.boss.timer > 0) return;
    const pattern = this.patternIndex % 4;
    this.patternIndex += 1;
    if (pattern === 0) this.telegraphCharge();
    if (pattern === 1) this.spawnWave();
    if (pattern === 2) this.spawnHomingData();
    if (pattern === 3) this.spawnClones();
  }

  updatePhaseFour() {
    this.moveBossToward(this.canvas.width / 2, 125, 3);
    if (this.boss.state === "open") {
      if (this.boss.timer <= 0) { this.boss.state = "closed"; this.boss.vulnerable = 0; this.boss.timer = 0.65; }
      return;
    }
    if (this.boss.timer > 0) return;
    const pattern = this.patternIndex % 3;
    this.patternIndex += 1;
    if (pattern === 0) this.spawnSweep();
    if (pattern === 1) this.spawnWave(true);
    if (pattern === 2) this.spawnDangerFloor();
    this.boss.state = "open";
    this.boss.vulnerable = 2.5;
    this.boss.timer = 2.5;
  }

  moveBossToward(x, y, factor) {
    this.boss.x += (x - this.boss.x) * Math.min(1, factor * 0.016);
    this.boss.y += (y - this.boss.y) * Math.min(1, factor * 0.016);
  }

  fireAtPlayer(special = false, speed = 190) {
    const dx = this.player.x - this.boss.x;
    const dy = this.player.y - this.boss.y;
    const length = Math.hypot(dx, dy) || 1;
    this.projectiles.push({ x: this.boss.x, y: this.boss.y, vx: dx / length * speed, vy: dy / length * speed, radius: special ? 14 : 10, special, reflected: false, homing: 0, life: 6 });
  }

  fireSpread(count, speed) {
    const base = Math.atan2(this.player.y - this.boss.y, this.player.x - this.boss.x);
    for (let index = 0; index < count; index += 1) {
      const angle = base + (index - (count - 1) / 2) * 0.28;
      this.projectiles.push({ x: this.boss.x, y: this.boss.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 9, special: false, reflected: false, homing: 0, life: 6 });
    }
  }

  spawnHomingData() {
    const angle = Math.atan2(this.player.y - this.boss.y, this.player.x - this.boss.x);
    this.projectiles.push({ x: this.boss.x, y: this.boss.y, vx: Math.cos(angle) * 125, vy: Math.sin(angle) * 125, radius: 13, special: false, reflected: false, homing: 2.2, life: 4 });
    this.finishPattern();
  }

  updateProjectiles(delta) {
    for (const projectile of this.projectiles) {
      if (projectile.homing > 0) {
        projectile.homing -= delta;
        const target = projectile.reflected ? this.boss : this.player;
        const angle = Math.atan2(target.y - projectile.y, target.x - projectile.x);
        projectile.vx += Math.cos(angle) * 85 * delta;
        projectile.vy += Math.sin(angle) * 85 * delta;
      }
      projectile.x += projectile.vx * delta;
      projectile.y += projectile.vy * delta;
      projectile.life -= delta;
      if (projectile.reflected && circlesOverlap(projectile, this.boss)) {
        projectile.life = 0;
        this.stunBoss(this.phase === FINAL_BOSS_PHASE.PROJECTILES ? 3 : 2.3);
      } else if (!projectile.reflected && circlesOverlap(projectile, this.player)) {
        projectile.life = 0;
        this.damagePlayer(projectile.special ? 8 : 11);
      }
    }
    this.projectiles = this.projectiles.filter((item) => item.life > 0 && item.x > -40 && item.x < this.canvas.width + 40 && item.y > -40 && item.y < this.canvas.height + 40);
  }

  spawnWave(final = false) {
    this.waves.push({ x: this.boss.x, y: this.boss.y, radius: 20, speed: final ? 245 : 190, gapAngle: Math.atan2(this.player.y - this.boss.y, this.player.x - this.boss.x), final, life: 2.5, hit: false });
    if (this.phase === 3) this.finishPattern();
  }

  updateWaves(delta) {
    for (const wave of this.waves) {
      wave.radius += wave.speed * delta;
      wave.life -= delta;
      const playerDistance = distance(wave, this.player);
      const playerAngle = Math.atan2(this.player.y - wave.y, this.player.x - wave.x);
      const angleDifference = Math.abs(Math.atan2(Math.sin(playerAngle - wave.gapAngle), Math.cos(playerAngle - wave.gapAngle)));
      if (!wave.hit && Math.abs(playerDistance - wave.radius) < 16 && angleDifference > 0.35) {
        wave.hit = true;
        this.damagePlayer(wave.final ? 16 : 12);
      }
    }
    this.waves = this.waves.filter((wave) => wave.life > 0);
  }

  spawnSweep() {
    const fromLeft = this.patternIndex % 2 === 0;
    for (let i = 0; i < 6; i += 1) {
      this.projectiles.push({ x: fromLeft ? -20 - i * 45 : this.canvas.width + 20 + i * 45, y: 120 + i * 70, vx: fromLeft ? 330 : -330, vy: 0, radius: 14, special: false, reflected: false, homing: 0, life: 4 });
    }
  }

  spawnDangerFloor() {
    const safeColumn = Math.floor(Math.random() * 4);
    const width = this.canvas.width / 4;
    for (let index = 0; index < 4; index += 1) {
      if (index !== safeColumn) this.hazards.push({ x: index * width + 5, y: this.canvas.height * 0.48, width: width - 10, height: this.canvas.height * 0.52 - 8, telegraph: 0.85, active: 0.55, hit: false });
    }
  }

  updateHazards(delta) {
    for (const hazard of this.hazards) {
      if (hazard.telegraph > 0) hazard.telegraph -= delta;
      else hazard.active -= delta;
      if (!hazard.hit && hazard.telegraph <= 0 && this.player.x >= hazard.x && this.player.x <= hazard.x + hazard.width && this.player.y >= hazard.y && this.player.y <= hazard.y + hazard.height) {
        hazard.hit = true;
        this.damagePlayer(18);
      }
    }
    this.hazards = this.hazards.filter((hazard) => hazard.active > 0);
  }

  spawnClones() {
    this.clones = [-150, 150].map((offset) => ({ x: clamp(this.boss.x + offset, 80, this.canvas.width - 80), y: this.boss.y + 50, life: 1.6 }));
    this.boss.vulnerable = 1.6;
    this.boss.timer = 1.6;
    this.boss.state = "stunned";
  }

  telegraphCharge() {
    const dx = this.player.x - this.boss.x;
    const dy = this.player.y - this.boss.y;
    const length = Math.hypot(dx, dy) || 1;
    this.boss.target = { x: dx / length, y: dy / length };
    this.boss.state = "telegraph";
    this.boss.timer = 0.65;
  }

  finishPattern() {
    this.boss.state = "stunned";
    this.boss.vulnerable = 2;
    this.boss.timer = 2;
  }

  stunBoss(seconds) {
    this.boss.state = "stunned";
    this.boss.vulnerable = seconds;
    this.boss.timer = seconds;
  }

  attack() {
    if (this.player.attackCooldown > 0 || this.phase === FINAL_BOSS_PHASE.DEFEATED) return;
    this.player.attackCooldown = 0.32;
    for (const projectile of this.projectiles) {
      if (projectile.special && !projectile.reflected && distance(projectile, this.player) < 72) {
        projectile.reflected = true;
        projectile.homing = 5;
        const angle = Math.atan2(this.boss.y - projectile.y, this.boss.x - projectile.x);
        projectile.vx = Math.cos(angle) * 310;
        projectile.vy = Math.sin(angle) * 310;
        return;
      }
    }
    if (this.boss.vulnerable > 0 && distance(this.player, this.boss) < this.player.radius + this.boss.radius + 46) this.damageBoss();
  }

  damageBoss() {
    // A successful Phase 2 reflection already carries most of the execution
    // difficulty, so one close-range punish advances the fight to Phase 3.
    const damage = this.phase === FINAL_BOSS_PHASE.PROJECTILES ? 25 : (this.phase === 4 ? 10 : 12.5);
    this.boss.hp = Math.max(0, this.boss.hp - damage);
    this.phaseHits += 1;
    this.boss.vulnerable = Math.min(this.boss.vulnerable, 0.35);
    const configured = this.config?.phaseHpThresholds ?? [75, 50, 25, 0];
    const thresholds = { 1: configured[0], 2: configured[1], 3: configured[2] };
    if (this.phase < 4 && this.boss.hp <= thresholds[this.phase]) this.changePhase(this.phase + 1);
    else if (this.phase === 4 && this.boss.hp <= 0) this.defeat();
  }

  changePhase(nextPhase) {
    this.clearAttacks();
    this.phase = nextPhase;
    this.phaseHits = 0;
    this.phaseElapsed = 0;
    this.patternIndex = 0;
    this.boss.state = "pattern";
    this.boss.timer = nextPhase === 4 ? 2 : 1;
    this.boss.vulnerable = 0;
    this.onPhaseChange?.(nextPhase);
  }

  clearAttacks() {
    this.projectiles = [];
    this.waves = [];
    this.hazards = [];
    this.clones = [];
  }

  damagePlayer(amount) {
    if (this.player.invulnerable > 0) return;
    this.player.invulnerable = this.config?.playerInvulnerabilitySeconds ?? 1.1;
    applyHpDelta(this.stats, -amount);
    this.onDamage?.(amount);
  }

  defeat() {
    this.phase = FINAL_BOSS_PHASE.DEFEATED;
    this.phaseElapsed = 0;
    this.boss.state = "defeated";
    this.clearAttacks();
    this.keys.clear();
    this.defeatTimer = 0;
    this.defeatNotified = false;
    this.onPhaseChange?.(this.phase);
  }

  emitUpdate() {
    this.onUpdate?.({ phase: this.phase, bossHp: this.boss.hp, bossMaxHp: this.boss.maxHp, playerHp: this.stats.hp, vulnerable: this.boss.vulnerable > 0 });
  }

  render() {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    ctx.fillStyle = "#07090d"; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(112,255,221,.12)"; ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = 56; y < height; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    for (const hazard of this.hazards) { ctx.fillStyle = hazard.telegraph > 0 ? "rgba(255,65,50,.22)" : "rgba(255,35,20,.72)"; ctx.fillRect(hazard.x, hazard.y, hazard.width, hazard.height); }
    for (const wave of this.waves) { ctx.strokeStyle = "#ef3dff"; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(wave.x, wave.y, wave.radius, wave.gapAngle + .35, wave.gapAngle + Math.PI * 2 - .35); ctx.stroke(); }
    for (const projectile of this.projectiles) {
      ctx.save(); ctx.translate(projectile.x, projectile.y); ctx.rotate(performance.now() / 180);
      ctx.fillStyle = projectile.special ? "#6ffff0" : "#ff315b";
      if (projectile.special) { ctx.fillRect(-12, -12, 24, 24); ctx.clearRect(-5, -5, 10, 10); }
      else { ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(12, 10); ctx.lineTo(-12, 10); ctx.fill(); }
      ctx.restore();
    }
    for (const clone of this.clones) this.drawBoss(clone.x, clone.y, 0.35, false);
    if (this.boss.state === "telegraph" && this.boss.target) {
      ctx.strokeStyle = "rgba(255,65,90,.75)"; ctx.lineWidth = 5; ctx.setLineDash([18, 12]);
      ctx.beginPath(); ctx.moveTo(this.boss.x, this.boss.y); ctx.lineTo(this.boss.x + this.boss.target.x * 900, this.boss.y + this.boss.target.y * 900); ctx.stroke(); ctx.setLineDash([]);
    }
    this.drawBoss(this.boss.x, this.boss.y, 1, this.boss.vulnerable > 0);
    if (!(this.player.invulnerable > 0 && Math.floor(performance.now() / 80) % 2)) this.drawPlayer();
    if (this.player.attackCooldown > 0.18) { ctx.strokeStyle = "#f6e59b"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(this.player.x, this.player.y, 52, 0, Math.PI * 2); ctx.stroke(); }
    if (this.phase === FINAL_BOSS_PHASE.DEFEATED) { ctx.fillStyle = `rgba(255,255,255,${Math.min(.7, this.defeatTimer / 4)})`; ctx.fillRect(0, 0, width, height); }
  }

  drawPlayer() {
    const image = this.images.player?.[this.player.facing] ?? this.images.player;
    if (image?.complete) {
      const frameWidth = image.naturalWidth / 4;
      const frame = this.player.moving ? Math.floor(this.player.animationTime / 0.14) % 4 : 0;
      this.ctx.drawImage(image, frame * frameWidth, 0, frameWidth, image.naturalHeight, this.player.x - 24, this.player.y - 32, 48, 64);
    }
    else { this.ctx.fillStyle = "#f4df9a"; this.ctx.fillRect(this.player.x - 15, this.player.y - 20, 30, 40); }
  }

  drawBoss(x, y, alpha, vulnerable) {
    const ctx = this.ctx;
    ctx.save(); ctx.globalAlpha = alpha;
    if (this.phase >= 3) { ctx.shadowColor = "#d52cff"; ctx.shadowBlur = 18 + Math.random() * 8; }
    if (vulnerable) { ctx.shadowColor = "#fff36b"; ctx.shadowBlur = 30; }
    const size = this.phase === 4 ? 150 : 112;
    const image = this.phase === 4 ? this.images.magic : this.images.boss;
    if (image?.complete) ctx.drawImage(image, 0, 0, 128, 128, x - size / 2, y - size / 2, size, size);
    else { ctx.fillStyle = vulnerable ? "#fff36b" : "#b21cff"; ctx.fillRect(x - size / 2, y - size / 2, size, size); }
    if (this.phase === 4) { ctx.fillStyle = vulnerable ? "#fff" : "#48154f"; ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
}
