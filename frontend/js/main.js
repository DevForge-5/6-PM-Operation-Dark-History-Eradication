import { GAME_CONFIG } from "./config.js";
import { createStats } from "./game/game-state.js";
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
    this.currentScene = createScene({
      root: this.root,
      config: this.config,
      session: this.session,
      payload,
      goTo: (nextName, nextPayload) => this.goTo(nextName, nextPayload),
    });
    this.currentScene.mount();
  }
}

const sceneManager = new SceneManager({
  root: document.querySelector("#scene-root"),
  config: GAME_CONFIG,
});

sceneManager.goTo("title");
