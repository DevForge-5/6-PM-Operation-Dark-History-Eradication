import { GAME_CONFIG } from "./config.js";
import { createStats } from "./game/game-state.js";
import { clearProgress, loadProgress, saveProgress } from "./game/session-storage.js";
import { createTitleScene } from "./scenes/title-scene.js";
import { createStoryScene } from "./scenes/story-scene.js";
import { createExplorationScene } from "./scenes/exploration-scene.js";
import { createBattleScene } from "./scenes/battle-scene.js";
import { createEndingScene } from "./scenes/ending-scene.js";

const SCENE_FACTORIES = {
  title: createTitleScene,
  story: createStoryScene,
  exploration: createExplorationScene,
  battle: createBattleScene,
  ending: createEndingScene,
};

class SceneManager {
  constructor({ root, config }) {
    this.root = root;
    this.config = config;
    this.session = { stats: createStats(config), clearedEvents: new Set(), inventory: new Set() };
    this.currentScene = null;
    this.currentSceneName = null;
    this.currentPayload = undefined;
    this.persist = this.persist.bind(this);
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
    const createScene = SCENE_FACTORIES[name];
    if (!createScene) {
      throw new Error(`알 수 없는 씬입니다: ${name}`);
    }

    if (name === "story") {
      this.session.stats = createStats(this.config);
      this.session.clearedEvents = new Set();
      this.session.inventory = new Set();
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
      persist: this.persist,
    });
    this.currentScene.mount();

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

const savedProgress = loadProgress();
if (savedProgress && savedProgress.scene && savedProgress.scene !== "title" && SCENE_FACTORIES[savedProgress.scene]) {
  sceneManager.session.stats = savedProgress.stats ?? createStats(GAME_CONFIG);
  sceneManager.session.clearedEvents = new Set(savedProgress.clearedEvents ?? []);
  sceneManager.session.inventory = new Set(savedProgress.inventory ?? []);
  sceneManager.goTo(savedProgress.scene, savedProgress.payload ?? undefined);
} else {
  sceneManager.goTo("title");
}
