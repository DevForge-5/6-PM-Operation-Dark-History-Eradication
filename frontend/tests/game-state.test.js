import { GAME_CONFIG } from "../js/config.js";
import { moveWithAxisCollisions } from "../js/game/game-controller.js";
import {
  clearInput,
  createGameState,
  getMovementVector,
  setDirection,
} from "../js/game/game-state.js";

const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function nearlyEqual(actual, expected, tolerance = 0.0001) {
  return Math.abs(actual - expected) <= tolerance;
}

test("초기 좌표가 설정값과 같다", () => {
  const state = createGameState(GAME_CONFIG);
  assert(state.player.x === 128 && state.player.y === 192, "주인공 초기 좌표가 다릅니다.");
  assert(state.monster.x === 768 && state.monster.y === 128, "괴물 초기 좌표가 다릅니다.");
});

test("대각선 이동 벡터의 길이는 1이다", () => {
  const state = createGameState(GAME_CONFIG);
  setDirection(state.input, "keyboard", "up", true);
  setDirection(state.input, "keyboard", "right", true);
  const vector = getMovementVector(state.input);
  assert(nearlyEqual(Math.hypot(vector.x, vector.y), 1), "대각선 속도가 정규화되지 않았습니다.");
});

test("키보드와 터치 입력을 함께 합친다", () => {
  const state = createGameState(GAME_CONFIG);
  setDirection(state.input, "keyboard", "left", true);
  setDirection(state.input, "touch", "down", true);
  const vector = getMovementVector(state.input);
  assert(vector.x < 0 && vector.y > 0, "입력 소스가 함께 반영되지 않았습니다.");
});

test("입력 해제 시 이동 벡터가 0이 된다", () => {
  const state = createGameState(GAME_CONFIG);
  setDirection(state.input, "keyboard", "right", true);
  setDirection(state.input, "touch", "up", true);
  clearInput(state.input);
  const vector = getMovementVector(state.input);
  assert(vector.x === 0 && vector.y === 0, "입력이 완전히 해제되지 않았습니다.");
});

test("막힌 축은 멈추고 열린 축으로 미끄러진다", () => {
  const position = { x: 5, y: 5 };
  const next = moveWithAxisCollisions(
    position,
    -10,
    3,
    (x, y) => x >= 0 && y >= 0 && x <= 10 && y <= 10,
  );
  assert(next.x === 5 && next.y === 8, "축별 충돌 처리가 올바르지 않습니다.");
});

const results = document.querySelector("#results");
let passed = 0;

for (const item of tests) {
  const result = document.createElement("li");
  try {
    item.run();
    result.className = "pass";
    result.textContent = `통과: ${item.name}`;
    passed += 1;
  } catch (error) {
    result.className = "fail";
    result.textContent = `실패: ${item.name} — ${error.message}`;
  }
  results.append(result);
}

const summary = document.querySelector("#summary");
summary.textContent = `${passed}/${tests.length}개 테스트 통과`;
summary.dataset.passed = String(passed);
summary.dataset.total = String(tests.length);
