import { createResultScreen } from "../ui/result-screen.js";
import { resolveEnding } from "../data/endings.js";
import { audioManager } from "../audio/audio-manager.js";

export function createEndingScene({ root, session, goTo }) {
  let node = null;
  let resultScreen = null;

  function mount() {
    node = document.createElement("section");
    node.className = "scene ending-scene";
    node.setAttribute("aria-label", "엔딩 화면");
    root.appendChild(node);

    const ending = resolveEnding(session.stats, session.selectedEndingId);
    if (ending.id === "ending2") {
      audioManager.playSfx("screen_glitch");
    }
    audioManager.playSfx(ending.type === "True" || ending.type === "Secret" ? "mission_clear" : "game_over");
    resultScreen = createResultScreen({
      root: node,
      ending,
      stats: session.stats,
      clearTimeMs: session.clearTimeMs,
      playerName: session.playerName,
      onRestart: () => goTo("title"),
    });
  }

  function unmount() {
    resultScreen?.destroy();
    resultScreen = null;
    node?.remove();
    node = null;
  }

  return { mount, unmount };
}
