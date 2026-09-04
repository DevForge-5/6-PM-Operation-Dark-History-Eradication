import { registerAudio } from "./audio-settings.js";

const AUDIO_ROOT = "./assets/audio";
const SOUND_PATHS = Object.freeze({
  menuBgm: `${AUDIO_ROOT}/bgm/menu_biohazard.ogg`,
  gameplayBgm: `${AUDIO_ROOT}/bgm/gameplay_wasteland_loop.ogg`,
  button_hover: `${AUDIO_ROOT}/sfx/ui/button_hover.ogg`,
  button_click: `${AUDIO_ROOT}/sfx/ui/button_click.ogg`,
  start_game: `${AUDIO_ROOT}/sfx/ui/start_game.ogg`,
  option_open: `${AUDIO_ROOT}/sfx/ui/option_open.ogg`,
  window_close: `${AUDIO_ROOT}/sfx/ui/window_close.ogg`,
  pause_open: `${AUDIO_ROOT}/sfx/ui/pause_open.ogg`,
  resume_game: `${AUDIO_ROOT}/sfx/ui/resume_game.ogg`,
  go_home: `${AUDIO_ROOT}/sfx/ui/go_home.ogg`,
  pause_checkbox: `${AUDIO_ROOT}/sfx/ui/pause_checkbox.ogg`,
  volume_change: `${AUDIO_ROOT}/sfx/ui/volume_change.ogg`,
  retry: `${AUDIO_ROOT}/sfx/ui/retry.ogg`,
  leaderboard_open: `${AUDIO_ROOT}/sfx/ui/leaderboard_open.ogg`,
  item_box_open: `${AUDIO_ROOT}/sfx/gameplay/item_box_open.ogg`,
  machine_cogs: `${AUDIO_ROOT}/sfx/gameplay/machine_cogs.ogg`,
  footstep_stairs: `${AUDIO_ROOT}/sfx/gameplay/footstep_stairs.ogg`,
  qte_start: `${AUDIO_ROOT}/sfx/events/qte_start.ogg`,
  qte_success: `${AUDIO_ROOT}/sfx/events/qte_success.ogg`,
  qte_fail: `${AUDIO_ROOT}/sfx/events/qte_fail.ogg`,
  warning: `${AUDIO_ROOT}/sfx/events/warning.ogg`,
  boss_appear: `${AUDIO_ROOT}/sfx/events/boss_appear.ogg`,
  screen_glitch: `${AUDIO_ROOT}/sfx/events/screen_glitch.ogg`,
  cringe_up: `${AUDIO_ROOT}/sfx/events/cringe_up.ogg`,
  damage: `${AUDIO_ROOT}/sfx/events/damage.ogg`,
  game_over: `${AUDIO_ROOT}/sfx/events/game_over.ogg`,
  mission_clear: `${AUDIO_ROOT}/sfx/events/mission_clear.ogg`,
});

const FOOTSTEPS = Array.from(
  { length: 5 },
  (_, index) => `${AUDIO_ROOT}/sfx/gameplay/footstep_concrete_0${index + 1}.ogg`,
);
const MIN_REPLAY_GAP_MS = 60;

function createAudio(source, type, loop = false) {
  const audio = new Audio(source);
  audio.preload = "auto";
  audio.loop = loop;
  registerAudio(type, audio);
  return audio;
}

class AudioManager {
  constructor() {
    this.sounds = new Map();
    this.lastPlayedAt = new Map();
    this.currentBgmName = null;
    this.isBgmPaused = false;
    this.isMuted = false;
    this.hasUserGesture = false;
    this.bgm = {
      menuBgm: createAudio(SOUND_PATHS.menuBgm, "bgm", true),
      gameplayBgm: createAudio(SOUND_PATHS.gameplayBgm, "bgm", true),
    };

    this.footsteps = [];
    this.unlock = this.unlock.bind(this);
    window.addEventListener("pointerdown", this.unlock, { once: true });
    window.addEventListener("keydown", this.unlock, { once: true });
  }

  getSfx(name) {
    if (!this.sounds.has(name) && SOUND_PATHS[name]) {
      const audio = createAudio(SOUND_PATHS[name], "sfx");
      audio.muted = this.isMuted;
      this.sounds.set(name, audio);
    }
    return this.sounds.get(name);
  }

  unlock() {
    this.hasUserGesture = true;
    this.playCurrentBgm();
  }

  playSfx(name, minGapMs = MIN_REPLAY_GAP_MS) {
    const audio = this.getSfx(name);
    if (!audio || this.isMuted) {
      return;
    }

    const now = performance.now();
    if (now - (this.lastPlayedAt.get(name) ?? -Infinity) < minGapMs) {
      return;
    }
    this.lastPlayedAt.set(name, now);
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  stopSfx(name) {
    const audio = this.sounds.get(name);
    if (!audio) {
      return;
    }
    audio.pause();
    audio.currentTime = 0;
    this.lastPlayedAt.delete(name);
  }

  playFootstep(onStairs = false) {
    if (this.isMuted) {
      return;
    }
    if (onStairs) {
      this.playSfx("footstep_stairs", 220);
      return;
    }
    if (this.footsteps.length === 0) {
      this.footsteps = FOOTSTEPS.map((path) => createAudio(path, "sfx"));
    }
    const audio = this.footsteps[Math.floor(Math.random() * this.footsteps.length)];
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  setBgm(name) {
    if (this.currentBgmName === name) {
      this.playCurrentBgm();
      return;
    }
    for (const audio of Object.values(this.bgm)) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.currentBgmName = name;
    this.playCurrentBgm();
  }

  playCurrentBgm() {
    const audio = this.bgm[this.currentBgmName];
    if (!audio || !this.hasUserGesture || this.isBgmPaused || this.isMuted) {
      return;
    }
    audio.play().catch(() => {});
  }

  setBgmPaused(isPaused) {
    this.isBgmPaused = isPaused;
    const audio = this.bgm[this.currentBgmName];
    if (isPaused) {
      audio?.pause();
    } else {
      this.playCurrentBgm();
    }
  }

  setMuted(isMuted) {
    this.isMuted = isMuted;
    for (const audio of [...Object.values(this.bgm), ...this.sounds.values(), ...this.footsteps]) {
      audio.muted = isMuted;
    }
    if (!isMuted) {
      this.playCurrentBgm();
    }
  }
}

export const audioManager = new AudioManager();

export function bindGlobalUiSounds(root = document) {
  root.addEventListener("pointerover", (event) => {
    const button = event.target.closest("button");
    if (button && !button.contains(event.relatedTarget)) {
      audioManager.playSfx("button_hover", 80);
    }
  });

  root.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || button.dataset.audioHandled === "true") {
      return;
    }
    audioManager.playSfx(button.dataset.sound || "button_click");
  });
}
