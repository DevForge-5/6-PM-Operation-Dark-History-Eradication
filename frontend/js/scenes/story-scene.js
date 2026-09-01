import { createDialogBox } from "../ui/dialog.js";

const INTRO_LINES = [
  "17:00. 방송부 봉사활동 중, 실수로 흑역사 중앙 인쇄 서버에\n초·중학교 시절 중2병 다이어리와 울면서 찍은 셀카 데이터를 떨어뜨렸다.",
  "18:00 정각, 전국의 모든 전광판과 SNS로 이 데이터가 생중계된다.\n그 전에 서버실로 가서 사태를 수습해야 한다.",
];

export function createStoryScene({ root, goTo }) {
  let node = null;
  let dialog = null;
  let index = 0;

  function mount() {
    node = document.createElement("section");
    node.className = "scene story-scene";
    node.setAttribute("aria-label", "인트로 스토리");
    root.appendChild(node);

    dialog = createDialogBox({ root: node });
    dialog.show(INTRO_LINES[index]);

    const advanceStory = () => {
      index += 1;
      if (index >= INTRO_LINES.length) {
        goTo("exploration");
        return;
      }
      dialog.show(INTRO_LINES[index]);
    };
    dialog.setAdvanceHandler(advanceStory);
  }

  function unmount() {
    dialog?.destroy();
    dialog = null;
    node?.remove();
    node = null;
  }

  return { mount, unmount };
}
