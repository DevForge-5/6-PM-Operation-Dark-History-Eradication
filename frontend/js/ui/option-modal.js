import {
  getAudioSettings,
  setBgmVolume,
  setSfxVolume,
} from "../audio/audio-settings.js";
import { audioManager } from "../audio/audio-manager.js";

const VOLUME_STEP = 10;

export function createOptionModal({ root, onClose, onRestart }) {
  const node = document.createElement("div");
  node.className = "option-modal";
  node.setAttribute("role", "dialog");
  node.setAttribute("aria-modal", "true");
  node.setAttribute("aria-labelledby", "option-title");
  node.innerHTML = `
    <div class="option-modal__panel">
      <header class="option-modal__header">
        <h2 id="option-title">OPTION</h2>
        <button type="button" class="option-modal__close" data-action="close" data-sound="window_close" aria-label="설정 닫기">×</button>
      </header>
      <div class="option-modal__divider" aria-hidden="true"><span>☠</span></div>
      <div class="option-modal__controls">
        <section class="option-volume" data-volume="sfx">
          <div class="option-volume__heading">
            <h3>효과음</h3>
            <output data-role="volume-output">100%</output>
          </div>
          <div class="option-volume__control">
            <button type="button" data-action="decrease" data-sound="volume_change" aria-label="효과음 볼륨 낮추기">−</button>
            <input type="range" min="0" max="100" step="10" value="100" aria-label="효과음 볼륨">
            <button type="button" data-action="increase" data-sound="volume_change" aria-label="효과음 볼륨 높이기">＋</button>
          </div>
        </section>
        <section class="option-volume" data-volume="bgm">
          <div class="option-volume__heading">
            <h3>배경음악</h3>
            <output data-role="volume-output">100%</output>
          </div>
          <div class="option-volume__control">
            <button type="button" data-action="decrease" data-sound="volume_change" aria-label="배경음악 볼륨 낮추기">−</button>
            <input type="range" min="0" max="100" step="10" value="100" aria-label="배경음악 볼륨">
            <button type="button" data-action="increase" data-sound="volume_change" aria-label="배경음악 볼륨 높이기">＋</button>
          </div>
        </section>
      </div>
      <button type="button" class="option-modal__restart" data-action="show-restart" data-sound="retry">다시하기</button>
      <section class="option-modal__confirm" data-role="restart-confirm" aria-label="다시하기 확인" hidden>
        <p>진행 상황을 초기화하고 처음부터 다시 시작할까요?</p>
        <div>
          <button type="button" data-action="cancel-restart">취소</button>
          <button type="button" data-action="confirm-restart">확인</button>
        </div>
      </section>
    </div>
  `;
  root.appendChild(node);

  const settings = getAudioSettings();
  const confirmPanel = node.querySelector("[data-role='restart-confirm']");
  const closeButton = node.querySelector("[data-action='close']");

  function updateControl(type, value) {
    const section = node.querySelector(`[data-volume='${type}']`);
    const input = section.querySelector("input");
    const output = section.querySelector("output");
    input.value = String(value);
    input.style.setProperty("--volume", `${value}%`);
    output.value = `${value}%`;
    output.textContent = `${value}%`;
  }

  updateControl("sfx", settings.sfx);
  updateControl("bgm", settings.bgm);
  closeButton.focus();

  function changeVolume(type, value) {
    const nextValue = type === "sfx" ? setSfxVolume(value) : setBgmVolume(value);
    updateControl(type, nextValue);
  }

  function handleInput(event) {
    const section = event.target.closest("[data-volume]");
    if (event.target.matches("input[type='range']") && section) {
      changeVolume(section.dataset.volume, event.target.value);
      audioManager.playSfx("volume_change");
    }
  }

  function handleClick(event) {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) {
      return;
    }

    if (action === "close") {
      onClose();
      return;
    }

    if (action === "show-restart") {
      confirmPanel.hidden = false;
      confirmPanel.querySelector("[data-action='cancel-restart']").focus();
      return;
    }

    if (action === "cancel-restart") {
      confirmPanel.hidden = true;
      node.querySelector("[data-action='show-restart']").focus();
      return;
    }

    if (action === "confirm-restart") {
      onRestart();
      return;
    }

    const section = event.target.closest("[data-volume]");
    if (section && (action === "decrease" || action === "increase")) {
      const input = section.querySelector("input");
      const delta = action === "increase" ? VOLUME_STEP : -VOLUME_STEP;
      changeVolume(section.dataset.volume, Number(input.value) + delta);
    }
  }

  function handleKeyDown(event) {
    if (event.code === "Escape") {
      event.preventDefault();
      audioManager.playSfx("window_close");
      onClose();
    }
  }

  node.addEventListener("input", handleInput);
  node.addEventListener("click", handleClick);
  window.addEventListener("keydown", handleKeyDown);

  function destroy() {
    node.removeEventListener("input", handleInput);
    node.removeEventListener("click", handleClick);
    window.removeEventListener("keydown", handleKeyDown);
    node.remove();
  }

  return { node, destroy };
}
