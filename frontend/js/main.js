import { GAME_CONFIG } from "./config.js";
import { createStats } from "./game/game-state.js";
import { clearProgress, loadProgress, saveProgress } from "./game/session-storage.js";
import { getClearTime, stopGameTimer } from "./game/game-timer.js";
import { createTitleScene } from "./scenes/title-scene.js";
import { createStoryScene } from "./scenes/story-scene.js";
import { createExplorationScene } from "./scenes/exploration-scene.js";
import { createBattleScene } from "./scenes/battle-scene.js";
import { createMimicBattleScene } from "./scenes/mimic-battle-scene.js";
import { createEndingScene } from "./scenes/ending-scene.js";
import { createLeaderboardScene } from "./scenes/leaderboard-scene.js";
import { createFinalBossScene } from "./scenes/final-boss-scene.js";
import { audioManager, bindGlobalUiSounds } from "./audio/audio-manager.js";
import { canTriggerEnding } from "./game/ending-flow.js";

const SCENE_FACTORIES = {
  title: createTitleScene,
  story: createStoryScene,
  exploration: createExplorationScene,
  battle: createBattleScene,
  mimicBattle: createMimicBattleScene,
  ending: createEndingScene,
  leaderboard: createLeaderboardScene,
  finalBoss: createFinalBossScene,
};

class SceneManager {
  constructor({ root, config }) {
    this.root = root;
    this.config = config;
    this.session = {
      stats: createStats(config),
      clearedEvents: new Set(),
      inventory: new Set(),
      collectedPickups: new Set(),
      triggeredHazards: new Set(),
      selectedEndingId: null,
      clearTimeMs: null,
      playerName: null,
      bossBattleStarted: false,
      bossBattleCompleted: false,
      bossFinalStoryStarted: false,
      bossStoryCompleted: false,
      bossCheckpointHp: null,
    };
    this.currentScene = null;
    this.currentSceneName = null;
    this.currentPayload = undefined;
    this.persist = this.persist.bind(this);
    this.startRun = this.startRun.bind(this);
  }

  startRun({ preservePlayerName = false } = {}) {
    const playerName = preservePlayerName ? this.session.playerName : null;
    this.session.stats = createStats(this.config);
    this.session.clearedEvents = new Set();
    this.session.inventory = new Set();
    this.session.collectedPickups = new Set();
    this.session.triggeredHazards = new Set();
    this.session.selectedEndingId = null;
    this.session.clearTimeMs = null;
    this.session.playerName = playerName;
    this.session.bossBattleStarted = false;
    this.session.bossBattleCompleted = false;
    this.session.bossFinalStoryStarted = false;
    this.session.bossStoryCompleted = false;
    this.session.bossCheckpointHp = null;
    stopGameTimer();
    this.goTo("story", { phase: "dialog", index: 0 });
  }

  persist(payloadPatch) {
    if (payloadPatch) {
      this.currentPayload = { ...(this.currentPayload ?? {}), ...payloadPatch };
    }
    if (!this.currentSceneName || this.currentSceneName === "title") {
      return;
    }
    saveProgress(this.currentSceneName, this.currentPayload, this.session);
  }

  goTo(name, payload) {
    if (name === "ending" && !canTriggerEnding(this.session)) {
      console.warn("Ending blocked until the final boss battle and story are complete.");
      if (this.currentSceneName !== "finalBoss") {
        name = "exploration";
        payload = this.currentPayload?.player ? { player: this.currentPayload.player } : undefined;
      } else {
        return;
      }
    }
    const createScene = SCENE_FACTORIES[name];
    if (!createScene) {
      throw new Error(`알 수 없는 씬입니다: ${name}`);
    }

    if (name === "title") {
      stopGameTimer();
    }

    if (name === "ending" && this.session.clearTimeMs === null) {
      this.session.clearTimeMs = getClearTime();
    }

    this.currentScene?.unmount();
    this.currentSceneName = name;
    this.currentPayload = payload;
    this.currentScene = createScene({
      root: this.root,
      config: this.config,
      session: this.session,
      payload,
      goTo: (nextName, nextPayload) => this.goTo(nextName, nextPayload),
      startRun: this.startRun,
      persist: this.persist,
    });
    this.currentScene.mount();
    audioManager.setBgm(["title", "leaderboard", "ending"].includes(name) ? "menuBgm" : "gameplayBgm");

    if (name === "title") {
      clearProgress();
    } else {
      this.persist();
    }
  }
}

const sceneManager = new SceneManager({
  root: document.querySelector("#scene-root"),
  config: GAME_CONFIG,
});

bindGlobalUiSounds();

const savedProgress = loadProgress();
if (savedProgress && savedProgress.scene && savedProgress.scene !== "title" && SCENE_FACTORIES[savedProgress.scene]) {
  sceneManager.session.stats = savedProgress.stats ?? createStats(GAME_CONFIG);
  sceneManager.session.clearedEvents = new Set(savedProgress.clearedEvents ?? []);
  sceneManager.session.inventory = new Set(savedProgress.inventory ?? []);
  sceneManager.session.collectedPickups = new Set(savedProgress.collectedPickups ?? []);
  sceneManager.session.triggeredHazards = new Set(savedProgress.triggeredHazards ?? []);
  sceneManager.session.playerName = savedProgress.playerName ?? null;
  sceneManager.session.bossBattleStarted = Boolean(savedProgress.bossBattleStarted);
  sceneManager.session.bossBattleCompleted = Boolean(savedProgress.bossBattleCompleted);
  sceneManager.session.bossFinalStoryStarted = Boolean(savedProgress.bossFinalStoryStarted);
  sceneManager.session.bossStoryCompleted = Boolean(savedProgress.bossStoryCompleted);
  sceneManager.session.bossCheckpointHp = savedProgress.bossCheckpointHp ?? null;
  sceneManager.goTo(savedProgress.scene, savedProgress.payload ?? undefined);
} else {
  sceneManager.goTo("title");
}
