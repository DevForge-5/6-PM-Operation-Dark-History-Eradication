import { createDialogBox } from "../ui/dialog.js";
import { createChoicePanel } from "../ui/choice-panel.js";
import { createHud } from "../ui/hud.js";
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

export function createBattleScene({ root, session, payload, goTo }) {
  const event = EVENTS[payload?.eventId] ?? EVENTS.hallwayShadow;
  let node = null;
  let hud = null;
  let dialog = null;
  let choicePanel = null;
  let introIndex = 0;

  function mount() {
    node = document.createElement("section");
    node.className = "scene battle-scene";
    node.setAttribute("aria-label", event.title);
    root.appendChild(node);

    hud = createHud({ root: node, stats: session.stats });
    dialog = createDialogBox({ root: node });
    dialog.show(event.intro[introIndex]);
    dialog.setAdvanceHandler(advanceIntro);
  }

  function advanceIntro() {
    introIndex += 1;
    if (introIndex < event.intro.length) {
      dialog.show(event.intro[introIndex]);
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
  }

  async function handleChoice(choice) {
    choicePanel.destroy();
    choicePanel = null;

    if (choice.requiresItem) {
      session.inventory.delete(choice.requiresItem);
    }

    let outcome = choice.effect;
    if (choice.type === "qte") {
      const success = await runQte({ root: node });
      outcome = success ? choice.onSuccess : choice.onFail;
    }

    applyHpDelta(session.stats, outcome.hpDelta ?? 0);
    applyCringeDelta(session.stats, outcome.cringeDelta ?? 0);
    advanceTime(session.stats, outcome.minutesDelta ?? 0);
    session.clearedEvents.add(event.id);
    hud.update(session.stats);

    if ((outcome.cringeDelta ?? 0) > 0) {
      triggerCringeFeedback();
    }

    dialog = createDialogBox({ root: node });
    dialog.show(outcome.resultText);
    dialog.setAdvanceHandler(finishBattle);
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

  function finishBattle() {
    if (isHpDepleted(session.stats) || isCringeMaxed(session.stats) || isTimeUp(session.stats)) {
      goTo("ending");
    } else {
      goTo("exploration");
    }
  }

  function unmount() {
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
