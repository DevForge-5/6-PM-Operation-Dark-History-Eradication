import { createDialogBox } from "../ui/dialog.js";
import { createChoicePanel } from "../ui/choice-panel.js";
import { createHud } from "../ui/hud.js";
import { createPauseOverlay } from "../ui/pause-overlay.js";
import { runQte } from "../minigames/qte.js";
import { EVENTS } from "../data/events.js";
import {
  advanceTime,
  applyCringeDelta,
  applyHpDelta,
  isCringeMaxed,
  isHpDepleted,
  isTimeUp,
} from "../game/game-state.js";
import { audioManager } from "../audio/audio-manager.js";

const RETREAT_DISTANCE = 64;

function getRetreatPosition(player) {
  const offsetByFacing = {
    up: { x: 0, y: RETREAT_DISTANCE },
    down: { x: 0, y: -RETREAT_DISTANCE },
    left: { x: RETREAT_DISTANCE, y: 0 },
    right: { x: -RETREAT_DISTANCE, y: 0 },
  };
  const offset = offsetByFacing[player.facing] ?? { x: 0, y: 0 };
  return { x: player.x + offset.x, y: player.y + offset.y, facing: player.facing };
}

export function createBattleScene({ root, session, payload, goTo, persist }) {
  const event = EVENTS[payload?.eventId] ?? EVENTS.hallwayShadow;
  let node = null;
  let hud = null;
  let dialog = null;
  let choicePanel = null;
  let introIndex = payload?.introIndex ?? 0;
  let isPaused = false;
  let isQteActive = false;
  let pauseOverlay = null;

  function setDialogAdvance(handler) {
    dialog?.setAdvanceHandler(() => {
      if (!isPaused) {
        handler();
      }
    });
  }

  function setPaused(next) {
    if (next === isPaused || isQteActive) {
      return;
    }
    isPaused = next;
    if (isPaused) {
      pauseOverlay = createPauseOverlay({
        root: node,
        onResume: () => setPaused(false),
        onHome: () => goTo("title", { preservePlayerName: true }),
      });
    } else {
      pauseOverlay?.destroy();
      pauseOverlay = null;
    }
  }

  function handlePauseKey(event) {
    if (event.code !== "Escape") {
      return;
    }
    event.preventDefault();
    setPaused(!isPaused);
  }

  function mount() {
    node = document.createElement("section");
    node.className = "scene battle-scene";
    node.setAttribute("aria-label", event.title);
    root.appendChild(node);
    window.addEventListener("keydown", handlePauseKey);
    audioManager.playSfx(event.id === "hallwayShadow" ? "boss_appear" : "warning");

    hud = createHud({ root: node, stats: session.stats });

    const phase = payload?.phase ?? "intro";
    if (phase === "result") {
      dialog = createDialogBox({ root: node });
      dialog.show(payload.resultText ?? "", { playerName: session.playerName });
      setDialogAdvance(() => finishBattle(Boolean(payload?.retry)));
    } else if (phase === "choice") {
      choicePanel = createChoicePanel({
        root: node,
        choices: event.choices,
        inventory: session.inventory,
        onSelect: handleChoice,
      });
    } else {
      dialog = createDialogBox({ root: node });
      dialog.show(event.intro[introIndex], { playerName: session.playerName });
      setDialogAdvance(advanceIntro);
      persist?.({ eventId: event.id, phase: "intro", introIndex });
    }
  }

  function advanceIntro() {
    introIndex += 1;
    if (introIndex < event.intro.length) {
      dialog.show(event.intro[introIndex], { playerName: session.playerName });
      persist?.({ phase: "intro", introIndex });
      return;
    }

    dialog.destroy();
    dialog = null;
    choicePanel = createChoicePanel({
      root: node,
      choices: event.choices,
      inventory: session.inventory,
      onSelect: handleChoice,
    });
    persist?.({ phase: "choice", introIndex: undefined });
  }

  async function handleChoice(choice) {
    choicePanel.destroy();
    choicePanel = null;
    persist?.({ phase: "choice" });

    if (choice.requiresItem) {
      session.inventory.delete(choice.requiresItem);
    }

    let outcome = choice.effect;
    if (choice.type === "qte") {
      isQteActive = true;
      const success = await runQte({ root: node });
      isQteActive = false;
      outcome = success ? choice.onSuccess : choice.onFail;
    }
    const isRetry = Boolean(outcome.retry);

    applyHpDelta(session.stats, outcome.hpDelta ?? 0);
    applyCringeDelta(session.stats, outcome.cringeDelta ?? 0);
    advanceTime(session.stats, outcome.minutesDelta ?? 0);
    if ((outcome.hpDelta ?? 0) < 0) {
      audioManager.playSfx("damage");
    }
    if (outcome.endingId) {
      session.selectedEndingId = outcome.endingId;
    }
    if (!isRetry) {
      session.clearedEvents.add(event.id);
    }
    hud.update(session.stats);

    if ((outcome.cringeDelta ?? 0) > 0) {
      audioManager.playSfx("cringe_up");
      triggerCringeFeedback();
    }

    dialog = createDialogBox({ root: node });
    dialog.show(outcome.resultText, { playerName: session.playerName });
    setDialogAdvance(() => finishBattle(isRetry));
    persist?.({ phase: "result", resultText: outcome.resultText, retry: isRetry });
  }

  function triggerCringeFeedback() {
    node.classList.remove("screen-shake");
    // eslint-disable-next-line no-unused-expressions
    node.offsetWidth; // force reflow so the animation restarts if it was already running
    node.classList.add("screen-shake");

    const flash = document.createElement("div");
    flash.className = "cringe-flash";
    node.appendChild(flash);
    flash.addEventListener("animationend", () => flash.remove(), { once: true });
  }

  function finishBattle(isRetry) {
    if (
      session.selectedEndingId
      || isHpDepleted(session.stats)
      || isCringeMaxed(session.stats)
      || isTimeUp(session.stats)
    ) {
      goTo("ending");
    } else {
      const playerPosition = payload?.player
        ? (isRetry ? getRetreatPosition(payload.player) : payload.player)
        : undefined;
      goTo("exploration", {
        ...(playerPosition ? { player: playerPosition } : {}),
        ...(isRetry ? {} : { defeatedEncounterId: event.id }),
      });
    }
  }

  function unmount() {
    window.removeEventListener("keydown", handlePauseKey);
    pauseOverlay?.destroy();
    pauseOverlay = null;
    choicePanel?.destroy();
    choicePanel = null;
    dialog?.destroy();
    dialog = null;
    hud?.destroy();
    hud = null;
    node?.remove();
    node = null;
  }

  return { mount, unmount };
}
