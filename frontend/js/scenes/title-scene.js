export function createTitleScene({ root, goTo }) {
  let node = null;
  let handleMenuClick = null;

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
        <li><button type="button" class="title-scene__menu-button" data-action="start">START</button></li>
        <li><button type="button" class="title-scene__menu-button" data-action="option">OPTION</button></li>
        <li><button type="button" class="title-scene__menu-button" data-action="exit">LEADERBOARD</button></li>
      </ul>
    `;
    root.appendChild(node);

    handleMenuClick = (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) {
        return;
      }

      if (button.dataset.action === "start") {
        goTo("story");
      }
    };
    node.addEventListener("click", handleMenuClick);
  }

  function unmount() {
    node?.removeEventListener("click", handleMenuClick);
    node?.remove();
    node = null;
  }

  return { mount, unmount };
}
