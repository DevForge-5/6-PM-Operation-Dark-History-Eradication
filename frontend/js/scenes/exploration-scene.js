import { GameController } from "../game/game-controller.js";
import { createHud } from "../ui/hud.js";
import { ITEMS } from "../data/items.js";
import { setGameTimerPaused } from "../game/game-timer.js";
import { createOptionModal } from "../ui/option-modal.js";

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
  let optionModal = null;
  let isPauseMenuOpen = false;
  let isForcePaused = false;
  let isSettingsOpen = false;

  function syncPauseState() {
    const shouldPauseGame = isPauseMenuOpen || isForcePaused || isSettingsOpen;
    controller.setPaused(shouldPauseGame);
    setGameTimerPaused(shouldPauseGame);
    node.querySelector("#pause-overlay").hidden = !isPauseMenuOpen;
  }

  function setPauseMenuOpen(isOpen) {
    isPauseMenuOpen = isOpen;
    syncPauseState();
    if (isOpen) {
      node.querySelector("#resume-button").focus();
    }
  }

  function openOptions() {
    isPauseMenuOpen = false;
    isSettingsOpen = true;
    syncPauseState();
    optionModal = createOptionModal({
      root: node.querySelector(".game-stage"),
      onClose: closeOptions,
      onRestart: () => goTo("story"),
    });
  }

  function closeOptions() {
    optionModal?.destroy();
    optionModal = null;
    isSettingsOpen = false;
    isPauseMenuOpen = true;
    syncPauseState();
  }

  function handlePauseKey(event) {
    if (event.code !== "Escape") {
      return;
    }

    event.preventDefault();
    if (isSettingsOpen) {
      return;
    }
    setPauseMenuOpen(!isPauseMenuOpen);
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
    const forcePauseCheckbox = node.querySelector("#force-pause-checkbox");
    forcePauseCheckbox.addEventListener("change", () => {
      isForcePaused = forcePauseCheckbox.checked;
      syncPauseState();
    });
    node.querySelector("#resume-button").addEventListener("click", () => setPauseMenuOpen(false));
    node.querySelector("#home-button").addEventListener("click", () => goTo("title"));
    node.querySelector("#pause-option-button").addEventListener("click", openOptions);
    node.querySelector("#mobile-pause-button").addEventListener("click", () => setPauseMenuOpen(true));
    window.addEventListener("keydown", handlePauseKey);
    controller.start();
  }

  function unmount() {
    window.removeEventListener("keydown", handlePauseKey);
    optionModal?.destroy();
    optionModal = null;
    setGameTimerPaused(false);
    controller?.destroy();
    controller = null;
    hud?.destroy();
    hud = null;
    node?.remove();
    node = null;
  }

  return { mount, unmount };
}
