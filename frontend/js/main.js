import { GAME_CONFIG } from "./config.js";
import { GameController } from "./game/game-controller.js";

const controller = new GameController({
  canvas: document.querySelector("#game-canvas"),
  controls: document.querySelectorAll("[data-direction]"),
  loadingMessage: document.querySelector("#loading-message"),
  assetError: document.querySelector("#asset-error"),
  config: GAME_CONFIG,
});

controller.start();
