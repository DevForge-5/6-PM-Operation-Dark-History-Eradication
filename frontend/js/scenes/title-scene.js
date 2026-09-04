import { createOptionModal } from "../ui/option-modal.js";

const START_FADE_MS = 550;

export function createTitleScene({ root, goTo, startRun, payload }) {
  let node = null;
  let handleMenuClick = null;
  let optionModal = null;
  let startTimerId = null;
  let isStarting = false;

  function closeOption() {
    optionModal?.destroy();
    optionModal = null;
    node.querySelector("[data-action='option']")?.focus();
  }

  function mount() {
    node = document.createElement("section");
    node.className = "scene title-scene";
    node.setAttribute("aria-label", "타이틀 화면");
    node.innerHTML = `
      <h1 class="title-scene__title">
        <img
          class="title-scene__logo"
          src="./assets/images/IntroTitleLogo.png"
          alt="오후 6시: 흑역사 전국 생중계 파괴 작전"
        >
      </h1>
      <ul class="title-scene__menu">
        <li><button type="button" class="title-scene__menu-button" data-action="start" data-sound="start_game">시작</button></li>
        <li><button type="button" class="title-scene__menu-button" data-action="option" data-sound="option_open">설정</button></li>
        <li><button type="button" class="title-scene__menu-button" data-action="exit" data-sound="leaderboard_open">순위표</button></li>
      </ul>
      <p class="title-scene__credit">DevForg5 Team [박소연, 김래원, 장예나, 김원균, 이윤재]</p>
      <div class="title-scene__fade" aria-hidden="true"></div>
    `;
    root.appendChild(node);

    handleMenuClick = (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) {
        return;
      }

      if (button.dataset.action === "start") {
        if (isStarting) {
          return;
        }
        isStarting = true;
        node.classList.add("is-starting");
        node.querySelectorAll("button").forEach((menuButton) => {
          menuButton.disabled = true;
        });
        startTimerId = window.setTimeout(() => startRun({
          preservePlayerName: Boolean(payload?.preservePlayerName),
        }), START_FADE_MS);
      } else if (button.dataset.action === "option" && !optionModal) {
        optionModal = createOptionModal({
          root: node,
          onClose: closeOption,
        });
      } else if (button.dataset.action === "exit") {
        goTo("leaderboard");
      }
    };
    node.addEventListener("click", handleMenuClick);
  }

  function unmount() {
    if (startTimerId !== null) {
      window.clearTimeout(startTimerId);
      startTimerId = null;
    }
    optionModal?.destroy();
    optionModal = null;
    node?.removeEventListener("click", handleMenuClick);
    node?.remove();
    node = null;
  }

  return { mount, unmount };
}
