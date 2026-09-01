import { GAME_CONFIG } from "../js/config.js";
import { getCameraPosition, moveWithAxisCollisions } from "../js/game/game-controller.js";
import {
  advanceTime,
  applyCringeDelta,
  applyHpDelta,
  clearInput,
  createGameState,
  createStats,
  getMovementVector,
  isTimeUp,
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
  assert(state.player.x === 1536 && state.player.y === 192, "주인공 초기 좌표가 다릅니다.");
  assert(state.encounters.length > 0 && state.encounters.every((e) => e.enabled), "조우 지점이 모두 활성화되어 있어야 합니다.");
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
  assert(next.x === 0 && next.y === 8, "축별 충돌 처리가 올바르지 않습니다.");
});

test("얇은 벽도 한 프레임에 건너뛰지 않는다", () => {
  const next = moveWithAxisCollisions(
    { x: 0, y: 0 },
    10,
    0,
    (x) => x < 4 || x > 6,
  );
  assert(next.x === 3, "얇은 벽을 건너뛰었습니다.");
});

test("카메라가 전체 맵 범위 안에서 주인공을 따라간다", () => {
  const state = createGameState(GAME_CONFIG);
  const camera = getCameraPosition(state.player, GAME_CONFIG);
  assert(camera.x === 1056 && camera.y === 0, "초기 카메라 위치가 올바르지 않습니다.");

  const edgeCamera = getCameraPosition(
    { x: GAME_CONFIG.world.width - 64, y: GAME_CONFIG.world.height - 64, size: 64 },
    GAME_CONFIG,
  );
  assert(edgeCamera.x === 2496 && edgeCamera.y === 640, "카메라가 맵 경계를 벗어났습니다.");
});

test("카메라가 브라우저 화면 크기를 기준으로 계산된다", () => {
  const state = createGameState(GAME_CONFIG);
  const camera = getCameraPosition(state.player, GAME_CONFIG, { width: 1280, height: 800 });
  assert(camera.x === 928 && camera.y === 0, "브라우저 크기가 카메라에 반영되지 않았습니다.");
});

test("스탯 초기값이 설정값과 같다", () => {
  const state = createGameState(GAME_CONFIG);
  assert(state.stats.timeMinutes === 17 * 60, "시작 시각이 17:00이 아닙니다.");
  assert(state.stats.hp === state.stats.hpMax, "HP 초기값이 최대치가 아닙니다.");
  assert(state.stats.cringe === 0, "Cringe 초기값이 0이 아닙니다.");
});

test("HP/Cringe는 0~최대치 범위로 clamp된다", () => {
  const stats = createStats(GAME_CONFIG);
  assert(applyHpDelta(stats, -9999) === 0, "HP가 0 밑으로 내려가지 않아야 합니다.");
  assert(applyCringeDelta(stats, 9999) === stats.cringeMax, "Cringe가 최대치를 넘지 않아야 합니다.");
});

test("시간은 마감 시각을 넘지 않고 isTimeUp이 true가 된다", () => {
  const stats = createStats(GAME_CONFIG);
  advanceTime(stats, 9999);
  assert(stats.timeMinutes === stats.limitMinutes, "시간이 마감 시각에서 멈추지 않았습니다.");
  assert(isTimeUp(stats), "마감 시각 도달이 감지되지 않았습니다.");
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
