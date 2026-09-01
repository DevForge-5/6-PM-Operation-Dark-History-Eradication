import { GameController } from "../game/game-controller.js";
import { createHud } from "../ui/hud.js";

export function createExplorationScene({ root, config, session, goTo }) {
  let node = null;
  let controller = null;
  let hud = null;

  function mount() {
    const template = document.querySelector("#exploration-scene-template");
    node = template.content.firstElementChild.cloneNode(true);
    node.classList.add("scene");
    root.appendChild(node);

    const stage = node.querySelector(".game-stage");
    hud = createHud({ root: stage, stats: session.stats });

    controller = new GameController({
      canvas: node.querySelector("#game-canvas"),
      controls: node.querySelectorAll("[data-direction]"),
      loadingMessage: node.querySelector("#loading-message"),
      assetError: node.querySelector("#asset-error"),
      config,
      stats: session.stats,
      onFrame: () => hud.update(session.stats),
      onEncounterMonster: () => goTo("battle", { eventId: "hallwayShadow" }),
    });
    controller.start();
  }

  function unmount() {
    controller?.destroy();
    controller = null;
    hud?.destroy();
    hud = null;
    node?.remove();
    node = null;
  }

  return { mount, unmount };
}
