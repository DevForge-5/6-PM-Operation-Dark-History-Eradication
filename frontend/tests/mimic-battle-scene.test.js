import { GAME_CONFIG } from "../js/config.js";
import { createStats } from "../js/game/game-state.js";
import { createMimicBattleScene } from "../js/scenes/mimic-battle-scene.js";

const root = document.querySelector("#scene-root");
const result = document.querySelector("#result");
const session = {
  stats: createStats(GAME_CONFIG),
  clearedEvents: new Set(),
  inventory: new Set(),
  playerName: "테스터",
};
let nextScene = null;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  const scene = createMimicBattleScene({
    root,
    config: GAME_CONFIG,
    session,
    payload: { phase: "battle", mimicHp: 0, player: { x: 0, y: 0, facing: "down" } },
    goTo: (name) => {
      nextScene = name;
    },
    persist: () => {},
  });
  scene.mount();

  const messageBox = root.querySelector(".mimic-battle__message-box");
  assert(messageBox.textContent.includes("미믹은 쓰러졌다"), "HP 0 복원 시 패배 연출이 표시되지 않았습니다.");
  messageBox.click();
  assert(session.clearedEvents.has("mimicBattle"), "미믹 클리어 상태가 저장되지 않았습니다.");
  assert(session.inventory.has(GAME_CONFIG.mimicBattle.rewardItemId), "미믹 보상이 지급되지 않았습니다.");
  assert(messageBox.textContent.includes("보상으로"), "보상 안내가 표시되지 않았습니다.");
  messageBox.click();
  assert(nextScene === "exploration", "미믹 처치 후 탐색 화면으로 돌아가지 않았습니다.");
  scene.unmount();

  const activeSession = {
    stats: createStats(GAME_CONFIG),
    clearedEvents: new Set(),
    inventory: new Set(),
    playerName: "테스터",
  };
  let activeNextScene = null;
  const activeScene = createMimicBattleScene({
    root,
    config: GAME_CONFIG,
    session: activeSession,
    payload: { phase: "battle", mimicHp: GAME_CONFIG.mimicBattle.playerAttackDamage, player: { x: 0, y: 0, facing: "down" } },
    goTo: (name) => {
      activeNextScene = name;
    },
    persist: () => {},
  });
  activeScene.mount();

  [...root.querySelectorAll("button")].find((button) => button.textContent === "싸운다").click();
  [...root.querySelectorAll("button")].find((button) => button.textContent === "때리기").click();
  const activeMessageBox = root.querySelector(".mimic-battle__message-box");
  activeMessageBox.click();
  activeMessageBox.click();
  assert(activeMessageBox.textContent.includes("미믹은 쓰러졌다"), "마지막 공격 후 패배 연출이 시작되지 않았습니다.");
  activeMessageBox.click();
  activeMessageBox.click();
  assert(activeNextScene === "exploration", "전투에서 미믹 HP가 0이 된 뒤 탐색 화면으로 돌아가지 않았습니다.");
  activeScene.unmount();

  const lethalAttackSession = {
    stats: createStats(GAME_CONFIG),
    clearedEvents: new Set(),
    inventory: new Set(),
    playerName: "테스터",
  };
  lethalAttackSession.stats.hp = GAME_CONFIG.mimicBattle.mimicAttackDamage;
  const lethalAttackScene = createMimicBattleScene({
    root,
    config: GAME_CONFIG,
    session: lethalAttackSession,
    payload: { phase: "battle", player: { x: 0, y: 0, facing: "down" } },
    goTo: () => {},
    startRun: () => {},
    persist: () => {},
  });
  lethalAttackScene.mount();

  [...root.querySelectorAll("button")].find((button) => button.textContent === "싸운다").click();
  [...root.querySelectorAll("button")].find((button) => button.textContent === "때리기").click();
  const lethalMessageBox = root.querySelector(".mimic-battle__message-box");
  lethalMessageBox.click();
  lethalMessageBox.click();
  lethalMessageBox.click();
  assert(lethalAttackSession.stats.hp === 0, "미믹의 치명 공격이 플레이어 HP를 0으로 만들지 않았습니다.");
  assert(root.querySelector("#mimic-death-overlay").hidden === false, "미믹 공격으로 HP가 0이 되었을 때 게임오버 창이 표시되지 않았습니다.");
  lethalAttackScene.unmount();

  const defeatedSession = {
    stats: createStats(GAME_CONFIG),
    clearedEvents: new Set(),
    inventory: new Set(),
    playerName: "테스터",
  };
  defeatedSession.stats.hp = 0;
  let restartOptions = null;
  const defeatedScene = createMimicBattleScene({
    root,
    config: GAME_CONFIG,
    session: defeatedSession,
    payload: { player: { x: 0, y: 0, facing: "down" } },
    goTo: () => {},
    startRun: (options) => {
      restartOptions = options;
    },
    persist: () => {},
  });
  defeatedScene.mount();

  const deathOverlay = root.querySelector("#mimic-death-overlay");
  assert(deathOverlay.hidden === false, "플레이어 HP 0 복원 시 게임오버 창이 표시되지 않았습니다.");
  assert(deathOverlay.textContent.includes("GAME OVER"), "게임오버 안내가 표시되지 않았습니다.");
  root.querySelector("#mimic-death-restart-button").click();
  assert(restartOptions?.preservePlayerName === true, "게임오버 다시 시작에서 플레이어 이름이 보존되지 않았습니다.");
  defeatedScene.unmount();

  result.dataset.passed = "true";
  result.textContent = "통과: 미믹 HP 0 복원·처치, 탐색 복귀 및 플레이어 HP 0 게임오버 테스트";
} catch (error) {
  result.dataset.passed = "false";
  result.textContent = `실패: ${error.message}`;
  throw error;
}
