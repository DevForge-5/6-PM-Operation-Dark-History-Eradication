import { GAME_CONFIG } from "../js/config.js";
import { createFinalBossScene } from "../js/scenes/final-boss-scene.js";

const root = document.querySelector("#scene-root");
const result = document.querySelector("#result");
const session = {
  stats: { hp: 100, hpMax: 100, cringe: 0, cringeMax: 100, timeMinutes: 1077, limitMinutes: 1080 },
  clearedEvents: new Set(),
  inventory: new Set(),
  bossBattleStarted: false,
  bossBattleCompleted: false,
  bossFinalStoryStarted: false,
  bossStoryCompleted: false,
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  const scene = createFinalBossScene({
    root,
    config: GAME_CONFIG,
    session,
    payload: { checkpoint: "intro" },
    goTo: () => {},
    persist: () => {},
  });
  scene.mount();

  const stageRect = root.querySelector(".final-boss-stage").getBoundingClientRect();
  assert(Math.abs(stageRect.width - window.innerWidth) < 1, "최종 보스전 너비가 전체 화면을 채우지 않습니다.");
  assert(Math.abs(stageRect.height - window.innerHeight) < 1, "최종 보스전 높이가 전체 화면을 채우지 않습니다.");

  const panel = root.querySelector(".final-boss-dialogue");
  const text = panel.querySelector("p");
  const firstLine = text.textContent;
  panel.click();
  assert(text.textContent !== firstLine, "클릭으로 다음 대사가 표시되지 않았습니다.");
  const secondLine = text.textContent;
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "Enter" }));
  assert(text.textContent !== secondLine, "Enter로 다음 대사가 표시되지 않았습니다.");
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
  assert(panel.hidden, "Space로 마지막 대사를 닫고 전투 준비로 넘어가지 않았습니다.");
  assert(root.querySelector(".final-boss-scene").dataset.battleState === "transition", "대화 종료 후 전투 전환이 시작되지 않았습니다.");
  await new Promise((resolve) => window.setTimeout(resolve, 1800));
  assert(root.querySelector(".final-boss-scene").dataset.battleState === "running", "전환 종료 후 보스전이 실행 상태가 되지 않았습니다.");

  scene.unmount();
  result.dataset.passed = "true";
  result.textContent = "통과: 최종 보스 전체 화면, 대화 입력 및 전투 시작 테스트";
} catch (error) {
  result.dataset.passed = "false";
  result.textContent = `실패: ${error.message}`;
  throw error;
}
