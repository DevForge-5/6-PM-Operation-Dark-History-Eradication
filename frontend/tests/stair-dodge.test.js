import { createStairDodge, STAIR_DODGE_LEVELS } from "../js/minigames/stair-dodge.js";

const root = document.querySelector("#scene-root");
const result = document.querySelector("#result");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  const normal = STAIR_DODGE_LEVELS[0];
  const hell = STAIR_DODGE_LEVELS.at(-1);
  assert(hell.crossSeconds < normal.crossSeconds, "Hell 모드 장애물이 기본 모드보다 빠르지 않습니다.");
  assert(hell.spawnInterval < normal.spawnInterval, "Hell 모드 장애물 간격이 기본 모드보다 짧지 않습니다.");
  assert(hell.requiredDodges > normal.requiredDodges, "Hell 모드 회피 횟수가 늘어나지 않았습니다.");
  assert(hell.damage === 5, "Hell 모드 충돌 피해가 가벼운 피해량으로 조정되지 않았습니다.");

  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  let nextFrame = null;
  window.requestAnimationFrame = (callback) => {
    nextFrame = callback;
    return 1;
  };
  window.cancelAnimationFrame = () => {
    nextFrame = null;
  };

  const damages = [];
  const game = createStairDodge({
    root,
    onDamage: (amount) => {
      damages.push(amount);
      return false;
    },
  });
  const character = root.querySelector(".stair-dodge__character");
  const startX = Number.parseFloat(character.style.left);
  let timestamp = 0;
  const advanceFrame = (milliseconds = 16) => {
    timestamp += milliseconds;
    const callback = nextFrame;
    nextFrame = null;
    callback(timestamp);
  };
  advanceFrame(0);
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD" }));
  for (let elapsed = 0; elapsed < 240; elapsed += 16) {
    advanceFrame();
  }
  window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyD" }));
  const movedX = Number.parseFloat(character.style.left);
  assert(movedX > startX, "D 키를 눌러도 캐릭터가 오른쪽으로 이동하지 않았습니다.");

  for (let elapsed = 0; elapsed < 4000 && damages.length === 0; elapsed += 16) {
    advanceFrame();
  }
  assert(damages[0] === normal.damage, "빨간 장애물 충돌 시 기본 모드 HP 피해가 전달되지 않았습니다.");
  game.destroy();

  const progressionGame = createStairDodge({ root });
  advanceFrame(0);
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
  for (let elapsed = 0; elapsed < 12000 && root.querySelector(".puzzle-terminal__count").textContent === "0 / 4"; elapsed += 16) {
    advanceFrame();
  }
  assert(root.querySelector(".puzzle-terminal__count").textContent === "1 / 4", "장애물 5개를 피한 뒤에도 다음 단계로 넘어가지 않았습니다.");
  progressionGame.destroy();

  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
  result.dataset.passed = "true";
  result.textContent = "통과: 계단 점프맵 이동·피해·단계 진행·Hell 난이도 테스트";
} catch (error) {
  result.dataset.passed = "false";
  result.textContent = `실패: ${error.message}`;
  throw error;
}
