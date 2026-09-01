// TODO(FE-A, Day 3): 엔딩 분기(True/Bad 등) 로직으로 교체. 지금은 씬 전환 골격 확인용 자리표시자.
export function createEndingScene({ root, goTo }) {
  let node = null;
  let handleClick = null;

  function mount() {
    node = document.createElement("section");
    node.className = "scene placeholder-scene";
    node.setAttribute("aria-label", "엔딩 씬 (준비 중)");
    node.innerHTML = `
      <p>엔딩 씬 준비 중…</p>
      <button type="button" class="placeholder-scene__button" data-action="restart">처음으로</button>
    `;
    root.appendChild(node);

    handleClick = (event) => {
      if (event.target.closest("[data-action='restart']")) {
        goTo("title");
      }
    };
    node.addEventListener("click", handleClick);
  }

  function unmount() {
    node?.removeEventListener("click", handleClick);
    node?.remove();
    node = null;
  }

  return { mount, unmount };
}
