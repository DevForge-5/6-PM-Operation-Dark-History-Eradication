import { GameController } from "../game/game-controller.js";
import { createHud } from "../ui/hud.js";
import { ITEMS } from "../data/items.js";
import { setGameTimerPaused, startGameTimer } from "../game/game-timer.js";
import { createOptionModal } from "../ui/option-modal.js";
import { createPuzzleTerminal } from "../minigames/puzzle-terminal.js";
import { createDialogBox } from "../ui/dialog.js";
import { createChoicePanel } from "../ui/choice-panel.js";
import { EVENTS } from "../data/events.js";
import { advanceTime, applyCringeDelta, applyHpDelta } from "../game/game-state.js";
import { audioManager } from "../audio/audio-manager.js";

const SIREN_EVENT_ID = "musicRoomSiren";
const SIREN_INTRO_HAZARD_ID = "musicRoomSirenIntro";

function showPickupToast(stage, text) {
  const toast = document.createElement("div");
  toast.className = "pickup-toast";
  toast.textContent = text;
  stage.appendChild(toast);
  setTimeout(() => toast.remove(), 1800);
}

const POSITION_AUTOSAVE_INTERVAL_MS = 1000;

export function createExplorationScene({ root, config, session, payload, goTo, startRun, persist }) {
  let node = null;
  let controller = null;
  let hud = null;
  let isMuted = false;
  let autosaveIntervalId = null;
  let optionModal = null;
  let isPauseMenuOpen = false;
  let isForcePaused = false;
  let isSettingsOpen = false;
  let puzzleTerminal = null;
  let isPuzzleOpen = false;
  let lastFootstepAt = 0;
  let lastPlayerPosition = null;
  let sirenDialog = null;
  let sirenChoicePanel = null;
  let isSirenDialogueOpen = false;

  function persistPosition() {
    persist?.({
      player: {
        x: controller.state.player.x,
        y: controller.state.player.y,
        facing: controller.state.player.facing,
      },
    });
  }

  function isPlayerOnStairs(player) {
    const room = config.rooms?.find(({ id }) => id === "stairsRoom");
    return Boolean(room
      && player.x >= room.x
      && player.x <= room.x + room.width
      && player.y >= room.y
      && player.y <= room.y + room.height);
  }

  function syncPauseState() {
    const shouldPauseGame = isPauseMenuOpen
      || isForcePaused
      || isSettingsOpen
      || isPuzzleOpen
      || isSirenDialogueOpen;
    controller.setPaused(shouldPauseGame);
    setGameTimerPaused(shouldPauseGame);
    audioManager.setBgmPaused(shouldPauseGame);
    node.querySelector("#pause-overlay").hidden = !isPauseMenuOpen;
  }

  function setPauseMenuOpen(isOpen) {
    if (isOpen && controller?.isInputLocked) {
      return;
    }
    if (isOpen && !isPauseMenuOpen) {
      audioManager.playSfx("pause_open");
    }
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
      onRestart: () => startRun({ preservePlayerName: true }),
    });
  }

  function closeOptions() {
    optionModal?.destroy();
    optionModal = null;
    isSettingsOpen = false;
    isPauseMenuOpen = true;
    syncPauseState();
  }

  function openPuzzle() {
    isPuzzleOpen = true;
    syncPauseState();
    puzzleTerminal = createPuzzleTerminal({
      root: node.querySelector(".game-stage"),
      onComplete: () => {
        controller.setPuzzleSolved();
        closePuzzle();
      },
      onClose: closePuzzle,
    });
  }

  function closePuzzle() {
    puzzleTerminal?.destroy();
    puzzleTerminal = null;
    isPuzzleOpen = false;
    syncPauseState();
  }

  function handlePauseKey(event) {
    if (event.code !== "Escape") {
      return;
    }

    event.preventDefault();
    if (isSettingsOpen || isPuzzleOpen || isSirenDialogueOpen || controller?.isInputLocked) {
      return;
    }
    setPauseMenuOpen(!isPauseMenuOpen);
  }

  function toggleSound() {
    isMuted = !isMuted;
    audioManager.setMuted(isMuted);
    const button = node.querySelector("#sound-toggle-button");
    const icon = node.querySelector("#sound-toggle-icon");
    button.setAttribute("aria-pressed", String(isMuted));
    button.setAttribute("aria-label", isMuted ? "사운드 켜기" : "사운드 끄기");
    icon.src = isMuted
      ? "./assets/images/PausedIMG/mute.png"
      : "./assets/images/PausedIMG/speaker%201.png";
  }

  function triggerDamageFeedback() {
    const stage = node?.querySelector(".game-stage");
    if (!stage) {
      return;
    }

    stage.classList.remove("screen-shake");
    stage.offsetWidth;
    stage.classList.add("screen-shake");
    const handleShakeEnd = (event) => {
      if (event.target === stage && event.animationName === "screen-shake") {
        stage.classList.remove("screen-shake");
        stage.removeEventListener("animationend", handleShakeEnd);
      }
    };
    stage.addEventListener("animationend", handleShakeEnd);

    const damageOverlay = node.querySelector("#damage-flash-overlay");
    if (damageOverlay) {
      damageOverlay.classList.remove("is-visible");
      damageOverlay.offsetWidth;
      damageOverlay.classList.add("is-visible");
      damageOverlay.addEventListener("animationend", () => {
        damageOverlay.classList.remove("is-visible");
      }, { once: true });
    }
  }

  function showHazardWarning() {
    const overlay = node?.querySelector("#hazard-warning-overlay");
    if (!overlay) {
      return;
    }

    overlay.hidden = false;
    overlay.classList.add("is-visible");
    window.setTimeout(() => {
      overlay.classList.remove("is-visible");
      overlay.hidden = true;
    }, 1500);
  }

  function showDeathScreen() {
    setGameTimerPaused(true);
    audioManager.setBgmPaused(true);
    audioManager.playSfx("game_over");
    const deathOverlay = node?.querySelector("#death-overlay");
    if (!deathOverlay) {
      return;
    }

    deathOverlay.hidden = false;
    deathOverlay.querySelector("#death-restart-button")?.focus();
  }

  // --- 음악실 세이렌 보스전 (in-world, see game/siren-fight.js) ---------------

  function closeSirenDialogue() {
    sirenChoicePanel?.destroy();
    sirenChoicePanel = null;
    sirenDialog?.destroy();
    sirenDialog = null;
    isSirenDialogueOpen = false;
    syncPauseState();
  }

  function showSirenLines(lines, onDone) {
    isSirenDialogueOpen = true;
    syncPauseState();

    sirenChoicePanel?.destroy();
    sirenChoicePanel = null;
    sirenDialog?.destroy();
    sirenDialog = createDialogBox({ root: node.querySelector(".game-stage") });

    let index = 0;
    const showCurrent = () => {
      sirenDialog.show(lines[index], {
        speaker: EVENTS[SIREN_EVENT_ID].title,
        progress: lines.length > 1 ? `${index + 1} / ${lines.length}` : undefined,
        playerName: session.playerName,
      });
    };

    sirenDialog.setAdvanceHandler(() => {
      index += 1;
      if (index < lines.length) {
        showCurrent();
        return;
      }
      onDone();
    });
    showCurrent();
  }

  function applySirenEffect(effect) {
    if (!effect) {
      return;
    }
    if (effect.hpDelta) {
      applyHpDelta(session.stats, effect.hpDelta);
      if (effect.hpDelta < 0) {
        audioManager.playSfx("damage");
        triggerDamageFeedback();
      }
    }
    if (effect.cringeDelta) {
      applyCringeDelta(session.stats, effect.cringeDelta);
      if (effect.cringeDelta > 0) {
        audioManager.playSfx("cringe_up");
      }
    }
    if (effect.minutesDelta) {
      advanceTime(session.stats, effect.minutesDelta);
    }
    hud.update(session.stats);
  }

  function updateSirenHud(snapshot) {
    const overlay = node?.querySelector("#siren-boss-hud");
    const prompt = node?.querySelector("#siren-boss-prompt");
    if (!overlay || !prompt) {
      return;
    }

    if (!snapshot?.active) {
      overlay.hidden = true;
      prompt.textContent = "";
      prompt.classList.remove("is-visible");
      return;
    }

    overlay.hidden = false;
    overlay.querySelector(".siren-boss-hud__round").textContent = `ROUND ${snapshot.round} / ${snapshot.totalRounds}`;
    const pips = overlay.querySelectorAll(".siren-boss-hud__pip");
    pips.forEach((pip, index) => {
      pip.classList.toggle("is-broken", index >= snapshot.sirenHp);
    });
    prompt.textContent = snapshot.prompt ?? "";
    prompt.classList.toggle("is-visible", Boolean(snapshot.prompt));
  }

  function startSirenIntro() {
    const event = EVENTS[SIREN_EVENT_ID];
    const hasSeenIntro = session.triggeredHazards.has(SIREN_INTRO_HAZARD_ID);
    const lines = hasSeenIntro ? event.reentry : event.intro;
    audioManager.playSfx("boss_appear");

    showSirenLines(lines, () => {
      if (!hasSeenIntro) {
        session.triggeredHazards.add(SIREN_INTRO_HAZARD_ID);
        persist?.();
      }
      closeSirenDialogue();
      controller.startSirenFight();
    });
  }

  function openSirenDialogue(dialogueId) {
    const dialogue = EVENTS[SIREN_EVENT_ID].dialogues[dialogueId];
    if (!dialogue) {
      controller.resumeSirenFight();
      return;
    }

    showSirenLines(dialogue.lines, () => {
      sirenDialog.setAdvanceHandler(null);
      sirenChoicePanel = createChoicePanel({
        root: node.querySelector(".game-stage"),
        choices: dialogue.choices,
        inventory: session.inventory,
        onSelect: (choice) => {
          sirenChoicePanel.destroy();
          sirenChoicePanel = null;
          applySirenEffect(choice.effect);
          showSirenLines([choice.resultText], () => {
            closeSirenDialogue();
            controller.resumeSirenFight(choice.effect);
          });
        },
      });
    });
  }

  function finishSirenFight(hasWon) {
    const outcome = EVENTS[SIREN_EVENT_ID].outcomes[hasWon ? "win" : "lose"];
    updateSirenHud(null);
    audioManager.playSfx(hasWon ? "mission_clear" : "qte_fail");

    if (hasWon) {
      session.clearedEvents.add(SIREN_EVENT_ID);
    }
    applySirenEffect(outcome);
    persistPosition();

    showSirenLines([outcome.resultText], () => {
      closeSirenDialogue();
      persistPosition();
    });
  }

  function handlePrincipalStateChange(state) {
    const stage = node?.querySelector(".game-stage");
    if (!stage) {
      return;
    }

    node.querySelector("#principal-danger-overlay")?.classList.toggle("is-visible", state !== "seated");
    if (state === "suspicious") {
      triggerDamageFeedback();
    }
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
      playerPosition: payload?.player,
      clearedEventIds: session.clearedEvents,
      collectedItemIds: session.collectedPickups,
      triggeredHazardIds: session.triggeredHazards,
      defeatedEncounterId: payload?.defeatedEncounterId,
      playIntroReveal: Boolean(payload?.playIntroReveal),
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      onReady: () => {
        if (payload?.playIntroReveal) {
          startGameTimer();
        }
      },
      onIntroRevealEnd: () => {
        if (payload?.playIntroReveal) {
          persist?.({ playIntroReveal: false });
        }
      },
      onFrame: (state) => {
        hud.update(session.stats);
        const { x, y } = state.player;
        const moved = lastPlayerPosition && (x !== lastPlayerPosition.x || y !== lastPlayerPosition.y);
        const now = performance.now();
        if (moved && now - lastFootstepAt >= 280) {
          audioManager.playFootstep(isPlayerOnStairs(state.player));
          lastFootstepAt = now;
        }
        lastPlayerPosition = { x, y };
      },
      onEncounter: (eventId) => {
        const { x, y, facing } = controller.state.player;
        if (eventId === "mimicBattle") {
          goTo("mimicBattle", { player: { x, y, facing } });
        } else {
          goTo("battle", { eventId, player: { x, y, facing } });
        }
      },
      onReachGoal: () => {
        audioManager.playSfx("machine_cogs");
        goTo("ending");
      },
      onPickup: (itemId) => {
        audioManager.playSfx("item_box_open");
        session.inventory.add(itemId);
        session.collectedPickups.add(itemId);
        persistPosition();
        showPickupToast(stage, `${ITEMS[itemId]?.name ?? itemId} 획득!`);
      },
      onDamage: () => {
        audioManager.playSfx("damage");
        triggerDamageFeedback();
      },
      onHazardTriggered: (hazardId) => {
        session.triggeredHazards.add(hazardId);
        persist?.();
        if (hazardId === "officeVaseAttack") {
          showHazardWarning();
        }
      },
      onPlayerDeath: showDeathScreen,
      onPrincipalStateChange: handlePrincipalStateChange,
      onDefeatAnimationEnd: () => persist?.({ defeatedEncounterId: undefined }),
      onComputerInteract: () => {
        if (!isPuzzleOpen) {
          openPuzzle();
        }
      },
      onSirenFightTrigger: startSirenIntro,
      onSirenDialogue: openSirenDialogue,
      onSirenFightUpdate: updateSirenHud,
      onSirenFightEnd: finishSirenFight,
    });
    const forcePauseCheckbox = node.querySelector("#force-pause-checkbox");
    forcePauseCheckbox.addEventListener("change", () => {
      isForcePaused = forcePauseCheckbox.checked;
      audioManager.playSfx("pause_checkbox");
      syncPauseState();
    });
    node.querySelector("#resume-button").addEventListener("click", () => setPauseMenuOpen(false));
    node.querySelector("#sound-toggle-button").addEventListener("click", toggleSound);
    node.querySelector("#home-button").addEventListener("click", () => goTo("title", { preservePlayerName: true }));
    node.querySelector("#pause-option-button").addEventListener("click", openOptions);
    node.querySelector("#mobile-pause-button").addEventListener("click", () => {
      if (!controller.isInputLocked) {
        setPauseMenuOpen(true);
      }
    });
    node.querySelector("#death-restart-button").addEventListener("click", () => startRun({ preservePlayerName: true }));
    node.querySelector("#death-home-button").addEventListener("click", () => goTo("title"));
    window.addEventListener("keydown", handlePauseKey);
    controller.start();
    autosaveIntervalId = window.setInterval(persistPosition, POSITION_AUTOSAVE_INTERVAL_MS);
  }

  function unmount() {
    if (autosaveIntervalId !== null) {
      window.clearInterval(autosaveIntervalId);
      autosaveIntervalId = null;
    }
    window.removeEventListener("keydown", handlePauseKey);
    optionModal?.destroy();
    optionModal = null;
    puzzleTerminal?.destroy();
    puzzleTerminal = null;
    sirenChoicePanel?.destroy();
    sirenChoicePanel = null;
    sirenDialog?.destroy();
    sirenDialog = null;
    isSirenDialogueOpen = false;
    setGameTimerPaused(false);
    audioManager.setBgmPaused(false);
    controller?.destroy();
    controller = null;
    hud?.destroy();
    hud = null;
    node?.remove();
    node = null;
  }

  return { mount, unmount };
}
