import { GAME_CONFIG } from "../js/config.js";
import { createWalkableTileMap, getCameraPosition, moveWithAxisCollisions } from "../js/game/game-controller.js";
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
import { formatTime, getClearTime, setGameTimerPaused, startGameTimer, stopGameTimer } from "../js/game/game-timer.js";
import { ENDINGS, resolveEnding } from "../js/data/endings.js";
import { EVENTS } from "../js/data/events.js";
import {
  ENDING_IDS,
  RANKING_STORAGE_KEY,
  getPlayerRank,
  getRanking,
  saveRanking,
} from "../js/api/speedrun-ranking.js";
import { renderRanking } from "../js/ui/result-screen.js";
import {
  getAudioSettings,
  registerAudio,
  setBgmVolume,
  setSfxVolume,
} from "../js/audio/audio-settings.js";

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

test("새 맵 crop 크기가 게임 월드와 같다", () => {
  assert(GAME_CONFIG.assets.map.endsWith("/MapGrid.png"), "새 맵 이미지가 설정되지 않았습니다.");
  assert(GAME_CONFIG.mapCrop.width === GAME_CONFIG.world.width, "맵 crop 너비가 월드와 다릅니다.");
  assert(GAME_CONFIG.mapCrop.height === GAME_CONFIG.world.height, "맵 crop 높이가 월드와 다릅니다.");
  assert(GAME_CONFIG.world.width % GAME_CONFIG.collision.tileSize === 0, "월드 너비가 충돌 타일에 맞지 않습니다.");
  assert(GAME_CONFIG.world.height % GAME_CONFIG.collision.tileSize === 0, "월드 높이가 충돌 타일에 맞지 않습니다.");
});

test("바닥 타일만 이동 가능하고 벽 타일은 차단된다", () => {
  const tileMap = createWalkableTileMap(["##..", "##.."]);
  assert(tileMap.data[0] === 1, "바닥 타일이 이동 불가로 판정됐습니다.");
  assert(tileMap.data[2] === 0, "벽 타일이 이동 가능으로 판정됐습니다.");
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
  assert(camera.x === 1275.4285714285716 && camera.y === 59.428571428571416, "초기 카메라 위치가 올바르지 않습니다.");

  const edgeCamera = getCameraPosition(
    { x: GAME_CONFIG.world.width - 64, y: GAME_CONFIG.world.height - 64, size: 64 },
    GAME_CONFIG,
  );
  assert(edgeCamera.x === 2934.857142857143 && edgeCamera.y === 886.8571428571429, "카메라가 맵 경계를 벗어났습니다.");
});

test("카메라가 브라우저 화면 크기를 기준으로 계산된다", () => {
  const state = createGameState(GAME_CONFIG);
  const camera = getCameraPosition(state.player, GAME_CONFIG, { width: 1280, height: 800 });
  assert(camera.x === 1202.2857142857142 && camera.y === 0, "브라우저 크기가 카메라에 반영되지 않았습니다.");
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

test("밀리초 타이머가 분:초 형식으로 정확히 표시된다", () => {
  startGameTimer(1_000);
  assert(getClearTime(3_532) === 2_532, "플레이 시간이 밀리초 단위로 계산되지 않았습니다.");
  assert(formatTime(1_025_321) === "17:05", "17분 5초 형식이 올바르지 않습니다.");
  assert(formatTime(7_000) === "0:07", "1분 미만 기록 형식이 올바르지 않습니다.");
  assert(formatTime(3_661_000) === "61:01", "1시간이 넘는 기록 형식이 올바르지 않습니다.");
});

test("일시정지 동안의 시간은 플레이 기록에서 제외된다", () => {
  startGameTimer(1_000);
  setGameTimerPaused(true, 3_000);
  assert(getClearTime(8_000) === 2_000, "정지 중에도 타이머가 증가했습니다.");
  setGameTimerPaused(false, 8_000);
  assert(getClearTime(10_000) === 4_000, "재개 후 타이머가 정상 진행되지 않았습니다.");
  stopGameTimer();
});

test("오디오 볼륨은 저장되고 등록된 오디오 객체에 즉시 적용된다", () => {
  const original = getAudioSettings();
  const sfx = { volume: 0 };
  const bgm = { volume: 0 };
  const unregisterSfx = registerAudio("sfx", sfx);
  const unregisterBgm = registerAudio("bgm", bgm);
  try {
    setSfxVolume(30);
    setBgmVolume(70);
    assert(sfx.volume === 0.3, "효과음 Audio 객체에 볼륨이 적용되지 않았습니다.");
    assert(bgm.volume === 0.7, "BGM Audio 객체에 볼륨이 적용되지 않았습니다.");
    assert(getAudioSettings().sfx === 30 && getAudioSettings().bgm === 70, "오디오 설정이 저장되지 않았습니다.");
  } finally {
    unregisterSfx();
    unregisterBgm();
    setSfxVolume(original.sfx);
    setBgmVolume(original.bgm);
  }
});

test("게임 상태와 선택 루트에 따라 5개 엔딩을 구분한다", () => {
  const stats = createStats(GAME_CONFIG);
  assert(resolveEnding(stats) === ENDINGS.ending1, "True 엔딩 판정이 올바르지 않습니다.");
  stats.timeMinutes = stats.limitMinutes;
  assert(resolveEnding(stats) === ENDINGS.ending2, "시간 초과 Bad 엔딩 판정이 올바르지 않습니다.");
  stats.hp = 0;
  assert(resolveEnding(stats) === ENDINGS.ending3, "HP 소진 Bad 엔딩 판정이 올바르지 않습니다.");
  assert(resolveEnding(stats, "ending4") === ENDINGS.ending4, "Hidden 엔딩 판정이 올바르지 않습니다.");
  assert(resolveEnding(stats, "ending5") === ENDINGS.ending5, "Secret 엔딩 판정이 올바르지 않습니다.");
});

test("Hidden과 Secret 엔딩 선택지가 실제 전투 이벤트에 연결된다", () => {
  const endingIds = EVENTS.hallwayShadow.choices.map((choice) => choice.effect?.endingId).filter(Boolean);
  assert(endingIds.includes("ending4"), "흑역사 인정 루트가 Hidden 엔딩에 연결되지 않았습니다.");
  assert(endingIds.includes("ending5"), "두꺼비집 선택지가 Secret 엔딩에 연결되지 않았습니다.");
});

test("엔딩별 랭킹은 분리되고 timeMs 오름차순 상위 10개만 저장된다", () => {
  const original = localStorage.getItem(RANKING_STORAGE_KEY);
  try {
    localStorage.removeItem(RANKING_STORAGE_KEY);
    ENDING_IDS.forEach((endingId, endingIndex) => {
      saveRanking(endingId, `엔딩${endingIndex + 1}`, 50_000 + endingIndex);
    });
    saveRanking("ending1", "더빠른기록", 10_000);
    for (let index = 0; index < 10; index += 1) {
      saveRanking("ending1", `참가자${index}`, 20_000 + index);
    }

    const ending1 = getRanking("ending1");
    assert(ending1.length === 10, "엔딩별 랭킹이 최대 10개를 초과했습니다.");
    assert(ending1[0].timeMs === 10_000, "랭킹이 timeMs 오름차순으로 정렬되지 않았습니다.");
    assert(getRanking("ending2").length === 1, "서로 다른 엔딩의 랭킹이 섞였습니다.");
    assert(getPlayerRank("ending1", 10_000) === 1, "플레이어 순위를 찾지 못했습니다.");
  } finally {
    if (original === null) {
      localStorage.removeItem(RANKING_STORAGE_KEY);
    } else {
      localStorage.setItem(RANKING_STORAGE_KEY, original);
    }
  }
});

test("랭킹 닉네임은 HTML로 해석되지 않는다", () => {
  const original = localStorage.getItem(RANKING_STORAGE_KEY);
  try {
    localStorage.removeItem(RANKING_STORAGE_KEY);
    saveRanking("ending1", "<img src=x>", 1_000);
    const list = document.createElement("ol");
    renderRanking("ending1", list);
    assert(list.querySelector("img") === null, "닉네임이 HTML로 삽입됐습니다.");
    assert(list.textContent.includes("<img src=x>"), "닉네임 텍스트가 보존되지 않았습니다.");
  } finally {
    if (original === null) {
      localStorage.removeItem(RANKING_STORAGE_KEY);
    } else {
      localStorage.setItem(RANKING_STORAGE_KEY, original);
    }
  }
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
