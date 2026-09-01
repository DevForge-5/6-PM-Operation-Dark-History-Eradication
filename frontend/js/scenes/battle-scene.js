import { createDialogBox } from "../ui/dialog.js";
import { createChoicePanel } from "../ui/choice-panel.js";
import { createHud } from "../ui/hud.js";
import { runQte } from "../minigames/qte.js";
import { EVENTS } from "../data/events.js";
import { applyCringeDelta, applyHpDelta, isCringeMaxed, isHpDepleted } from "../game/game-state.js";

const EVENT = EVENTS.hallwayShadow;

export function createBattleScene({ root, session, goTo }) {
  let node = null;
  let hud = null;
  let dialog = null;
  let choicePanel = null;
  let onNodeClick = null;
  let introIndex = 0;

  function setNodeClick(handler) {
    if (onNodeClick) {
      node.removeEventListener("click", onNodeClick);
    }
    onNodeClick = handler;
    if (onNodeClick) {
      node.addEventListener("click", onNodeClick);
    }
  }

  function mount() {
    node = document.createElement("section");
    node.className = "scene battle-scene";
    node.setAttribute("aria-label", EVENT.title);
    root.appendChild(node);

    hud = createHud({ root: node, stats: session.stats });
    dialog = createDialogBox({ root: node });
    dialog.show(EVENT.intro[introIndex]);
    setNodeClick(advanceIntro);
  }

  function advanceIntro() {
    introIndex += 1;
    if (introIndex < EVENT.intro.length) {
      dialog.show(EVENT.intro[introIndex]);
      return;
    }

    setNodeClick(null);
    dialog.destroy();
    dialog = null;
    choicePanel = createChoicePanel({ root: node, choices: EVENT.choices, onSelect: handleChoice });
  }

  async function handleChoice(choice) {
    choicePanel.destroy();
    choicePanel = null;

    let outcome = choice.effect;
    if (choice.type === "qte") {
      const success = await runQte({ root: node });
      outcome = success ? choice.onSuccess : choice.onFail;
    }

    applyHpDelta(session.stats, outcome.hpDelta ?? 0);
    applyCringeDelta(session.stats, outcome.cringeDelta ?? 0);
    hud.update(session.stats);

    dialog = createDialogBox({ root: node });
    dialog.show(outcome.resultText);
    setNodeClick(finishBattle);
  }

  function finishBattle() {
    setNodeClick(null);
    if (isHpDepleted(session.stats) || isCringeMaxed(session.stats)) {
      goTo("ending");
    } else {
      goTo("exploration");
    }
  }

  function unmount() {
    setNodeClick(null);
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
