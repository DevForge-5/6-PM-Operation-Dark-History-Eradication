import { GAME_CONFIG } from "../js/config.js";
import { createFinalBossScene } from "../js/scenes/final-boss-scene.js?v=4";

const isOutroCheckpoint = new URLSearchParams(location.search).get("checkpoint") === "outro";
const session = {
  stats: { hp: 100, hpMax: 100, cringe: 0, cringeMax: 100, timeMinutes: 1077, limitMinutes: 1080 },
  clearedEvents: new Set(), inventory: new Set(), collectedPickups: new Set(), triggeredHazards: new Set(),
  bossBattleStarted: isOutroCheckpoint, bossBattleCompleted: isOutroCheckpoint, bossFinalStoryStarted: isOutroCheckpoint, bossStoryCompleted: false,
};

const scene = createFinalBossScene({
  root: document.querySelector("#scene-root"),
  config: GAME_CONFIG,
  session,
  payload: isOutroCheckpoint ? { checkpoint: "outro" } : {},
  goTo: (name) => document.body.dataset.nextScene = name,
  persist: () => {},
});
scene.mount();
