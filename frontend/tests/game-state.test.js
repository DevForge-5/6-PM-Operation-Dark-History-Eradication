import { GAME_CONFIG } from "../js/config.js";
import {
  GameController,
  createWalkableTileMap,
  getCameraPosition,
  getPrincipalState,
  moveWithAxisCollisions,
} from "../js/game/game-controller.js";
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

test("교장 상태가 앉아있음, 의심, 확인 순서로 전환된다", () => {
  const timing = GAME_CONFIG.office.principalTiming;
  assert(getPrincipalState(2.99, timing) === "seated", "3초 전에는 앉아있음 상태여야 합니다.");
  assert(getPrincipalState(3, timing) === "suspicious", "3초 후에는 의심 상태여야 합니다.");
  assert(getPrincipalState(4, timing) === "alert", "추가 1초 후에는 확인 상태여야 합니다.");
  assert(getPrincipalState(5, timing) === "seated", "확인 후에는 다시 앉아있음 상태여야 합니다.");
});

test("교장 확인 상태에서도 소파 앞 세이프 존은 피해를 막는다", () => {
  const stateChanges = [];
  const controller = new GameController({
    canvas: document.createElement("canvas"),
    controls: [],
    config: GAME_CONFIG,
    onPrincipalStateChange: (state) => stateChanges.push(state),
  });
  const safeZone = GAME_CONFIG.office.safeZone;
  controller.state.player.x = safeZone.x;
  controller.state.player.y = safeZone.y - GAME_CONFIG.player.size + GAME_CONFIG.player.footInsetY;
  controller.updatePrincipal(GAME_CONFIG.office.revealDuration / 2);
  assert(controller.officeRevealProgress > 0 && controller.officeRevealProgress < 1, "교무실 시야가 점진적으로 열리지 않습니다.");
  controller.updatePrincipal(3 - GAME_CONFIG.office.revealDuration / 2);
  controller.updatePrincipal(1);
  assert(controller.principalState === "alert", "교장이 확인 상태로 전환되지 않았습니다.");
  assert(stateChanges.join(",") === "suspicious,alert", "교장 상태 변경 알림 순서가 다릅니다.");
  assert(controller.state.stats.hp === GAME_CONFIG.stats.hpMax, "세이프 존 안에서 HP가 감소했습니다.");

  controller.state.player.x = GAME_CONFIG.office.bounds.x;
  controller.state.player.y = GAME_CONFIG.office.bounds.y;
  controller.updatePrincipal(0.1);
  assert(controller.state.stats.hp < GAME_CONFIG.stats.hpMax, "세이프 존 밖에서 HP가 감소하지 않았습니다.");
  controller.updatePrincipal(0.9);
  assert(controller.principalState === "seated", "확인 후 교장이 다시 앉지 않았습니다.");
  assert(stateChanges.join(",") === "suspicious,alert,seated", "교장 순환 상태 변경 알림 순서가 다릅니다.");

  controller.state.player.x = GAME_CONFIG.office.bounds.x + GAME_CONFIG.office.bounds.width;
  controller.updatePrincipal(GAME_CONFIG.office.revealDuration / 2);
  assert(controller.officeRevealProgress > 0 && controller.officeRevealProgress < 1, "교무실을 나갈 때 암막이 점진적으로 돌아오지 않습니다.");
  assert(controller.principalState === "seated", "교무실을 나가도 교장 상태가 초기화되지 않았습니다.");
});

test("HP가 0이 되면 피해 피드백과 사망 처리를 한 번만 호출한다", () => {
  let damageCount = 0;
  let deathCount = 0;
  const controller = new GameController({
    canvas: document.createElement("canvas"),
    controls: [],
    config: GAME_CONFIG,
    onDamage: () => {
      damageCount += 1;
    },
    onPlayerDeath: () => {
      deathCount += 1;
    },
  });
  controller.state.isRunning = true;

  controller.takeDamage(GAME_CONFIG.stats.hpMax);
  controller.takeDamage(10);

  assert(damageCount === 1, "실제 HP 감소 시 피해 피드백이 한 번 호출되어야 합니다.");
  assert(deathCount === 1, "사망 처리는 한 번만 호출되어야 합니다.");
  assert(controller.playerDefeated, "플레이어 사망 상태가 기록되지 않았습니다.");
  assert(!controller.state.isRunning, "사망 후 게임 루프가 중지되지 않았습니다.");
});

test("낙하 꽃병은 계단 벽이 아닌 안쪽 두 열에서 출발한다", () => {
  const sourceIndexes = GAME_CONFIG.office.vaseAttack.sourceVaseIndexes;
  assert(sourceIndexes.join(",") === "1,2", "낙하 꽃병 위치가 계단 안쪽으로 설정되지 않았습니다.");
});

test("한 번 발동한 꽃병 함정은 새로고침 후 다시 떨어지지 않는다", () => {
  const trigger = GAME_CONFIG.office.vaseAttack.trigger;
  const sourceIndexes = GAME_CONFIG.office.vaseAttack.sourceVaseIndexes;
  const insideTrigger = { x: trigger.x + 80, y: trigger.y + 20, facing: "down" };

  const triggeredIds = [];
  const firstVisit = new GameController({
    canvas: document.createElement("canvas"),
    controls: [],
    config: GAME_CONFIG,
    playerPosition: insideTrigger,
    onHazardTriggered: (id) => triggeredIds.push(id),
  });
  firstVisit.updateOfficeHazards(0.016);
  assert(firstVisit.vaseAttack.triggered, "발동 구역을 밟았는데 꽃병 함정이 발동하지 않았습니다.");
  assert(triggeredIds.includes("officeVaseAttack"), "함정 발동이 세션에 알려지지 않아 저장할 수 없습니다.");

  // 새로고침을 흉내낸다: 저장된 triggeredHazardIds를 그대로 다시 넘겨 새 컨트롤러를 만든다.
  const afterReload = new GameController({
    canvas: document.createElement("canvas"),
    controls: [],
    config: GAME_CONFIG,
    playerPosition: insideTrigger,
    triggeredHazardIds: new Set(triggeredIds),
  });
  assert(
    afterReload.vaseAttack.nextShot === sourceIndexes.length,
    "새로고침 후에도 꽃병이 다시 떨어질 준비 상태로 남아 있습니다.",
  );
  assert(
    sourceIndexes.every((index) => afterReload.vaseAttack.droppedVaseIndexes.has(index)),
    "새로고침 후 선반의 꽃병이 다시 채워진 것으로 그려집니다.",
  );

  afterReload.updateOfficeHazards(0.016);
  assert(
    afterReload.vaseAttack.projectiles.length === 0,
    "이미 피한 꽃병 함정이 새로고침 후 발동 구역에서 다시 투사체를 발사했습니다.",
  );
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
  assert(camera.x === 1363.2 && camera.y === 108.8, "초기 카메라 위치가 올바르지 않습니다.");

  const edgeCamera = getCameraPosition(
    { x: GAME_CONFIG.world.width - 64, y: GAME_CONFIG.world.height - 64, size: 64 },
    GAME_CONFIG,
  );
  assert(edgeCamera.x === 3110.4 && edgeCamera.y === 985.6, "카메라가 맵 경계를 벗어났습니다.");
});

test("카메라가 브라우저 화면 크기를 기준으로 계산된다", () => {
  const state = createGameState(GAME_CONFIG);
  const camera = getCameraPosition(state.player, GAME_CONFIG, { width: 1280, height: 800 });
  assert(camera.x === 1312 && camera.y === 64, "브라우저 크기가 카메라에 반영되지 않았습니다.");
});

test("방이 화면보다 크면 벽+여백(framePadding)을 포함해 방 전체가 보이도록 축소되어 고정된다", () => {
  const room = GAME_CONFIG.rooms.find((candidate) => candidate.id === "serverRoom");
  const framePadding = room.framePadding ?? 0;
  const player = { x: room.x + room.width / 2 - 32, y: room.y + room.height / 2 - 32, size: 64 };
  const viewport = { width: 1024, height: 576 };
  const camera = getCameraPosition(player, GAME_CONFIG, viewport);
  const expandedWidth = room.width + framePadding * 2;
  const expandedHeight = room.height + framePadding * 2;
  const expectedZoom = Math.min(GAME_CONFIG.camera.zoom, viewport.width / expandedWidth, viewport.height / expandedHeight);

  const visibleHeight = Math.min(viewport.height / expectedZoom, GAME_CONFIG.world.height);
  const expectedY = Math.max(0, Math.min(room.y - framePadding, GAME_CONFIG.world.height - visibleHeight));

  assert(nearlyEqual(camera.zoom, expectedZoom), "여유를 포함한 방 크기에 맞춰 줌이 축소되지 않았습니다.");
  assert(camera.zoom < GAME_CONFIG.camera.zoom, "방이 화면보다 큰데도 기본 줌이 유지되고 있습니다.");
  assert(nearlyEqual(camera.y, expectedY), "세로 방향 여유를 포함해 방이 고정되지 않았습니다(맵 경계 클램프 포함).");
});

test("나무 바닥 방은 계단쪽 입구 여유(marginTop) 범위까지만 방 시점을 유지한다 (발밑 기준 판정)", () => {
  const room = GAME_CONFIG.rooms.find((candidate) => candidate.id === "eastHall");
  const marginTop = room.marginTop ?? room.margin ?? 0;
  const doorwayX = room.x + room.width / 2;
  const viewport = { width: 1024, height: 576 };
  // 판정 기준이 발밑 픽셀 중앙(player.y + size - footInsetY)이므로, 원하는 footY를 만들려면 player.y = footY - size + footInsetY.
  const playerAtFoot = (footY) => ({ x: doorwayX - 32, y: footY - 64 + GAME_CONFIG.player.footInsetY, size: 64 });

  const cameraWellBeforeDoorway = getCameraPosition(playerAtFoot(room.y - marginTop - 100), GAME_CONFIG, viewport);
  assert(cameraWellBeforeDoorway.zoom === GAME_CONFIG.camera.zoom, "계단 복도 안인데도 방 시점으로 전환됐습니다.");
  assert(!cameraWellBeforeDoorway.room?.disableFog, "계단 복도 안인데도 그림자가 꺼졌습니다.");

  const cameraWithinMargin = getCameraPosition(playerAtFoot(room.y - marginTop / 2), GAME_CONFIG, viewport);
  assert(cameraWithinMargin.zoom < GAME_CONFIG.camera.zoom, "입구 여유 범위(벽에 붙은 위치)에서 방 시점이 유지되지 않았습니다.");
  assert(cameraWithinMargin.room?.disableFog === true, "입구 여유 범위에서 그림자가 꺼지지 않았습니다.");

  const cameraOnRoomTile = getCameraPosition(playerAtFoot(room.y), GAME_CONFIG, viewport);
  assert(cameraOnRoomTile.zoom < GAME_CONFIG.camera.zoom, "나무 타일을 밟았는데 방 시점으로 전환되지 않았습니다.");
  assert(cameraOnRoomTile.room?.disableFog === true, "나무 바닥 방인데 그림자가 꺼지지 않았습니다.");
});

test("eastHall 왼쪽 통로 경계는 여유 없이 그대로 유지된다", () => {
  const room = GAME_CONFIG.rooms.find((candidate) => candidate.id === "eastHall");
  const viewport = { width: 1024, height: 576 };
  const footY = room.y + room.height / 2;

  const playerJustOutsideLeft = { x: room.x - 1 - 32, y: footY - 64, size: 64 };
  const cameraJustOutsideLeft = getCameraPosition(playerJustOutsideLeft, GAME_CONFIG, viewport);
  assert(cameraJustOutsideLeft.zoom === GAME_CONFIG.camera.zoom, "왼쪽 통로에 여유가 생겨 방 시점이 앞당겨졌습니다.");

  const playerJustInsideLeft = { x: room.x - 32, y: footY - 64, size: 64 };
  const cameraJustInsideLeft = getCameraPosition(playerJustInsideLeft, GAME_CONFIG, viewport);
  assert(cameraJustInsideLeft.zoom < GAME_CONFIG.camera.zoom, "왼쪽 경계에 들어섰는데 방 시점으로 전환되지 않았습니다.");
});

test("방 시점 고정 상태에서는 그 방 밖 오브젝트(예: 컴퓨터)가 보이지 않는다", () => {
  const eastHall = GAME_CONFIG.rooms.find((candidate) => candidate.id === "eastHall");
  const computer = GAME_CONFIG.computer;
  const roomOverlapsComputer = (
    computer.x < eastHall.x + eastHall.width
    && computer.x + computer.size > eastHall.x
    && computer.y < eastHall.y + eastHall.height
    && computer.y + computer.size > eastHall.y
  );
  assert(!roomOverlapsComputer, "컴퓨터 오브젝트가 eastHall 방 범위 안에 있어 테스트 전제가 맞지 않습니다.");
});

test("stairsRoom은 왼쪽 통로 타일 경계를 정확히 넘으면 잠기고, 복도에서는 원래대로 돌아간다", () => {
  const room = GAME_CONFIG.rooms.find((candidate) => candidate.id === "stairsRoom");
  const doorwayFootY = room.y + room.height / 2;
  const viewport = { width: 1024, height: 576 };
  const at = (footX) => ({ x: footX - 32, y: doorwayFootY - 64, size: 64 });

  const cameraInCorridor = getCameraPosition(at(room.x - 1), GAME_CONFIG, viewport);
  assert(cameraInCorridor.zoom === GAME_CONFIG.camera.zoom, "경계를 넘기 전인데도 방 시점으로 전환됐습니다.");

  const cameraInsideRoom = getCameraPosition(at(room.x), GAME_CONFIG, viewport);
  assert(cameraInsideRoom.zoom < GAME_CONFIG.camera.zoom, "방 안인데 방 시점으로 전환되지 않았습니다.");
});

test("아래쪽 벽에 완전히 붙어도(충돌 판정상 최대치) 방 시점 고정이 풀리지 않는다", () => {
  const room = GAME_CONFIG.rooms.find((candidate) => candidate.id === "stairsRoom");
  const viewport = { width: 1024, height: 576 };
  // 벽에 밀착했을 때 스프라이트 전체 하단(player.y + size)이 방 경계에 딱 걸치는 위치.
  // footInsetY를 반영하지 않으면 이 지점에서 발 판정점이 방 경계를 벗어나 카메라 락이 풀린다.
  const playerAtBottomWall = {
    x: room.x + room.width / 2 - 32,
    y: room.y + room.height - 64,
    size: 64,
  };

  const camera = getCameraPosition(playerAtBottomWall, GAME_CONFIG, viewport);
  assert(camera.zoom < GAME_CONFIG.camera.zoom, "아래쪽 벽에 붙자 방 시점이 풀렸습니다.");
  assert(camera.room?.id === "stairsRoom", "아래쪽 벽에 붙자 방 정보가 사라졌습니다.");
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
