import { audioManager } from "../audio/audio-manager.js";
import { createOptionModal } from "./option-modal.js";
import { formatTime, getClearTime } from "../game/game-timer.js";

// Shared pause screen used by every full-screen scene (exploration mounts
// its own copy of this same markup directly in its template - keep this in
// sync with the `#pause-overlay` block in index.html) so ESC always looks
// and behaves the same regardless of what's currently on screen.
export function createPauseOverlay({ root, onResume, onHome, onForcePauseChange, onRestart }) {
  const node = document.createElement("section");
  node.className = "pause-overlay";
  node.setAttribute("aria-label", "일시 정지");
  node.innerHTML = `
    <label class="pause-overlay__title">
      <input type="checkbox">
      <span class="pause-overlay__checkbox" aria-hidden="true"></span>
      <span>멈추기</span>
    </label>
    <p class="pause-overlay__playtime">플레이 시간 ${formatTime(getClearTime())}</p>
    <div class="pause-overlay__actions">
      <button type="button" class="pause-overlay__action" data-action="resume" data-sound="resume_game">
        <span aria-hidden="true">▶</span> 재개
      </button>
      <button type="button" class="pause-overlay__action" data-action="home" data-sound="go_home">
        <span aria-hidden="true">⌂</span> 홈으로
      </button>
    </div>
    <button type="button" class="pause-overlay__sound" data-action="sound" aria-label="사운드 끄기" aria-pressed="false">
      <img class="pause-overlay__sound-icon" src="./assets/images/PausedIMG/speaker%201.png" alt="">
    </button>
    <button type="button" class="pause-overlay__option" data-action="option" data-sound="option_open" aria-label="설정 열기">⚙</button>
  `;
  root.appendChild(node);

  const forceCheckbox = node.querySelector("input[type='checkbox']");
  const soundButton = node.querySelector(".pause-overlay__sound");
  const soundIcon = node.querySelector(".pause-overlay__sound-icon");
  let optionModal = null;

  function refreshSoundIcon() {
    soundButton.setAttribute("aria-pressed", String(audioManager.isMuted));
    soundButton.setAttribute("aria-label", audioManager.isMuted ? "사운드 켜기" : "사운드 끄기");
    soundIcon.src = audioManager.isMuted
      ? "./assets/images/PausedIMG/mute.png"
      : "./assets/images/PausedIMG/speaker%201.png";
  }
  refreshSoundIcon();

  function closeOptions() {
    optionModal?.destroy();
    optionModal = null;
    node.hidden = false;
  }

  function handleClick(event) {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) {
      return;
    }
    if (action === "resume") {
      onResume?.();
    } else if (action === "home") {
      onHome?.();
    } else if (action === "sound") {
      audioManager.setMuted(!audioManager.isMuted);
      refreshSoundIcon();
    } else if (action === "option") {
      // option-modal shares this scene's z-index tier with the pause
      // overlay itself, so hide this while it's open instead of stacking
      // both (otherwise the modal would render underneath).
      node.hidden = true;
      optionModal = createOptionModal({ root, onClose: closeOptions, onRestart });
    }
  }

  function handleForceChange() {
    onForcePauseChange?.(forceCheckbox.checked);
  }

  node.addEventListener("click", handleClick);
  forceCheckbox.addEventListener("change", handleForceChange);

  function destroy() {
    node.removeEventListener("click", handleClick);
    forceCheckbox.removeEventListener("change", handleForceChange);
    optionModal?.destroy();
    optionModal = null;
    node.remove();
  }

  return { node, destroy };
}
