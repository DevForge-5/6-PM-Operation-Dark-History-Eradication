import { createResultScreen } from "../ui/result-screen.js";
import { resolveEnding } from "../data/endings.js";

export function createEndingScene({ root, session, goTo }) {
  let node = null;
  let resultScreen = null;

  function mount() {
    node = document.createElement("section");
    node.className = "scene ending-scene";
    node.setAttribute("aria-label", "엔딩 화면");
    root.appendChild(node);

    const ending = resolveEnding(session.stats);
    resultScreen = createResultScreen({
      root: node,
      ending,
      stats: session.stats,
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
