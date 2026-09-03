export function createPauseOverlay({ root, onResume, onHome }) {
  const node = document.createElement("section");
  node.className = "pause-overlay";
  node.setAttribute("aria-label", "일시 정지");
  node.innerHTML = `
    <h2 class="pause-overlay__title">일시정지</h2>
    <div class="pause-overlay__actions">
      <button class="pause-overlay__action" type="button" data-sound="resume_game">
        <span aria-hidden="true">▶</span> 재개
      </button>
      <button class="pause-overlay__action" type="button" data-sound="go_home">
        <span aria-hidden="true">⌂</span> 홈으로
      </button>
    </div>
  `;
  root.appendChild(node);

  const [resumeButton, homeButton] = node.querySelectorAll(".pause-overlay__action");
  resumeButton.addEventListener("click", () => onResume?.());
  homeButton.addEventListener("click", () => onHome?.());
  resumeButton.focus();

  function destroy() {
    node.remove();
  }

  return { node, destroy };
}
