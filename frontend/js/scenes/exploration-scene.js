import { GameController } from "../game/game-controller.js";
import { createHud } from "../ui/hud.js";
import { ITEMS } from "../data/items.js";

function showPickupToast(stage, text) {
  const toast = document.createElement("div");
  toast.className = "pickup-toast";
  toast.textContent = text;
  stage.appendChild(toast);
  setTimeout(() => toast.remove(), 1800);
}

export function createExplorationScene({ root, config, session, goTo }) {
  let node = null;
  let controller = null;
  let hud = null;

  function setPaused(isPaused) {
    controller.setPaused(isPaused);
    node.querySelector("#pause-overlay").hidden = !isPaused;
  }

  function handlePauseKey(event) {
    if (event.code !== "Escape") {
      return;
    }

    event.preventDefault();
    setPaused(!controller.state.isPaused);
  }

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
      clearedEventIds: session.clearedEvents,
      collectedItemIds: session.inventory,
      onFrame: () => hud.update(session.stats),
      onEncounter: (eventId) => goTo("battle", { eventId }),
      onReachGoal: () => goTo("ending"),
      onPickup: (itemId) => {
        session.inventory.add(itemId);
        showPickupToast(stage, `${ITEMS[itemId]?.name ?? itemId} 획득!`);
      },
    });
    node.querySelector("#resume-button").addEventListener("click", () => setPaused(false));
    node.querySelector("#mobile-pause-button").addEventListener("click", () => setPaused(true));
    window.addEventListener("keydown", handlePauseKey);
    controller.start();
  }

  function unmount() {
    window.removeEventListener("keydown", handlePauseKey);
    controller?.destroy();
    controller = null;
    hud?.destroy();
    hud = null;
    node?.remove();
    node = null;
  }

  return { mount, unmount };
}
