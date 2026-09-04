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
import { ENDING_IDS, getRanking, saveRanking } from "../js/api/speedrun-ranking.js";
import { renderRanking } from "../js/ui/result-screen.js";
import { createStoryScene, normalizePlayerName } from "../js/scenes/story-scene.js?test=story-intro-restart";
import { loadProgress, saveProgress } from "../js/game/session-storage.js";
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

test("음악실로 이어지는 계단 위쪽은 교장실로 인식되지 않는다", () => {
  const controller = new GameController({
    canvas: document.createElement("canvas"),
    controls: [],
    config: GAME_CONFIG,
  });

  // eastHall(음악실) 진입부의 실제 맵 좌표. office.bounds가 실제 교장실
  // 바닥보다 아래로 넓게 잡히면 여기가 교장실로 오인되어, 교장이 확인
  // 상태가 됐을 때 세이프 존 밖으로 취급돼 즉시 피해를 입는다.
  const footY = 650;
  controller.state.player.x = 2600;
  controller.state.player.y = footY - GAME_CONFIG.player.size + GAME_CONFIG.player.footInsetY;
  controller.updatePrincipal(0.016);

  assert(!controller.isInOffice, "음악실로 이어지는 계단 위쪽이 교장실로 인식됩니다.");
});

test("교장실 오른쪽 끝(계단 통로 바로 앞 타일)까지 교장실로 인식된다", () => {
  const controller = new GameController({
    canvas: document.createElement("canvas"),
    controls: [],
    config: GAME_CONFIG,
  });

  // office.bounds 오른쪽 경계가 실제 걸어다닐 수 있는 바닥보다 한 타일(64px)
  // 짧게 잡혀 있으면, 계단 통로 진입 직전 타일(오른쪽에서 두 번째 칸)에서
  // 교장 이벤트가 없고 시야도 좁아지는(교장실 밖 취급) 버그가 생긴다.
  const footX = 2850; // office.bounds 오른쪽 끝 타일(x:2816~2879) 한가운데
  const footY = 300;
  controller.state.player.x = footX - GAME_CONFIG.player.size / 2;
  controller.state.player.y = footY - GAME_CONFIG.player.size + GAME_CONFIG.player.footInsetY;
  controller.updatePrincipal(0.016);

  assert(controller.isInOffice, "계단 통로 진입 직전 타일이 교장실로 인식되지 않습니다.");
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

test("낙하 꽃병은 발동 구역(계단 통로) 바로 위 선반에서 출발해 플레이어 위로 떨어진다", () => {
  const vases = GAME_CONFIG.office.vases;
  const trigger = GAME_CONFIG.office.vaseAttack.trigger;
  const sourceIndexes = GAME_CONFIG.office.vaseAttack.sourceVaseIndexes;
  assert(sourceIndexes.join(",") === "1,2", "낙하 꽃병이 계단 통로 위 선반으로 설정되지 않았습니다.");

  for (const index of sourceIndexes) {
    const vase = vases[index];
    assert(
      vase.x >= trigger.x && vase.x + vase.size <= trigger.x + trigger.width,
      `선반 위치(x=${vase.x})가 발동 구역(x=${trigger.x}~${trigger.x + trigger.width}) 안에 있어야 통로에 선 플레이어에게 떨어집니다.`,
    );
  }
});

test("교무실 오른쪽 벽에 붙는 것만으로는 꽃병 함정이 발동하지 않는다", () => {
  // 발동 구역이 계단으로 이어지는 좁은 통로(x=2944~3072)보다 왼쪽에서 시작하면,
  // 계단 쪽으로 가지 않고 교무실 자체의 오른쪽 벽(바닥 끝 x≈2816~2879)에만 붙어도
  // 꽃병이 떨어지는 버그가 있었다. 발동 구역 진입 전, 벽 쪽 바닥에서는 발동하지
  // 않아야 한다.
  const trigger = GAME_CONFIG.office.vaseAttack.trigger;
  const nearRightWallFootX = 2820;
  assert(nearRightWallFootX < trigger.x, "테스트 좌표가 발동 구역보다 왼쪽에 있어야 합니다.");

  const nearRightWall = { x: nearRightWallFootX - 32, y: trigger.y - 4, facing: "down" };
  const controller = new GameController({
    canvas: document.createElement("canvas"),
    controls: [],
    config: GAME_CONFIG,
    playerPosition: nearRightWall,
  });
  controller.updateOfficeHazards(0.016);
  assert(!controller.vaseAttack.triggered, "계단 통로에 들어가지 않았는데 오른쪽 벽만으로 꽃병 함정이 발동했습니다.");
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

test("컴퓨터에 다가가면 퍼즐 상호작용이 한 번만 발동하고, 떠났다 돌아오면 다시 발동한다", () => {
  const computer = GAME_CONFIG.computer;
  const insideComputer = { x: computer.x, y: computer.y, facing: "down" };
  const farAway = { x: 0, y: 0, facing: "down" };

  let interactCount = 0;
  const controller = new GameController({
    canvas: document.createElement("canvas"),
    controls: [],
    config: GAME_CONFIG,
    playerPosition: farAway,
    onComputerInteract: () => {
      interactCount += 1;
    },
  });

  controller.updateComputerInteraction();
  assert(interactCount === 0, "컴퓨터에서 먼 곳에 있는데 상호작용이 발동했습니다.");

  controller.state.player.x = insideComputer.x;
  controller.state.player.y = insideComputer.y;
  controller.updateComputerInteraction();
  assert(interactCount === 1, "컴퓨터에 다가갔는데 퍼즐 상호작용이 발동하지 않았습니다.");

  controller.updateComputerInteraction();
  assert(interactCount === 1, "같은 자리에 계속 서있는데 퍼즐 상호작용이 또 발동했습니다.");

  controller.state.player.x = farAway.x;
  controller.state.player.y = farAway.y;
  controller.updateComputerInteraction();
  controller.state.player.x = insideComputer.x;
  controller.state.player.y = insideComputer.y;
  controller.updateComputerInteraction();
  assert(interactCount === 2, "떠났다가 돌아왔는데 퍼즐 상호작용이 다시 발동하지 않았습니다.");
});

test("퍼즐을 풀면 세션에 기록되고, 새로고침 후에도 완료 상태가 유지된다", () => {
  const before = new GameController({
    canvas: document.createElement("canvas"),
    controls: [],
    config: GAME_CONFIG,
  });
  before.prepareMapCollision();
  assert(!before.puzzleSolved, "시작하자마자 퍼즐이 이미 풀린 상태입니다.");

  const triggeredIds = [];
  before.onHazardTriggered = (id) => triggeredIds.push(id);
  before.setPuzzleSolved();
  assert(triggeredIds.includes("officePuzzleSolved"), "퍼즐 완료가 세션에 알려지지 않아 저장할 수 없습니다.");
  assert(before.puzzleSolved, "퍼즐을 풀었는데도 완료 상태로 바뀌지 않았습니다.");

  // 새로고침을 흉내낸다: 저장된 triggeredHazardIds를 그대로 다시 넘겨 새 컨트롤러를 만든다.
  const afterReload = new GameController({
    canvas: document.createElement("canvas"),
    controls: [],
    config: GAME_CONFIG,
    triggeredHazardIds: new Set(triggeredIds),
  });
  afterReload.prepareMapCollision();
  assert(afterReload.puzzleSolved, "새로고침 후 퍼즐 완료 상태가 유지되지 않았습니다.");
});

test("음악실 피아노 4개는 플레이어 이동을 막는다", () => {
  const controller = new GameController({
    canvas: document.createElement("canvas"),
    controls: [],
    config: GAME_CONFIG,
  });
  controller.prepareMapCollision();

  for (const piano of GAME_CONFIG.musicRoom.pianos) {
    const collisionBox = controller.getPianoCollisionBox(piano);
    const playerX = collisionBox.x + collisionBox.width / 2 - GAME_CONFIG.player.size / 2;
    const playerY = collisionBox.y + collisionBox.height / 2 - GAME_CONFIG.player.size / 2;
    assert(
      !controller.canPlayerOccupy(playerX, playerY),
      `${piano.corner} 피아노를 통과할 수 있습니다.`,
    );
  }
});

test("음악실 세이렌전 설정이 이벤트 데이터와 맞물린다", () => {
  const fight = GAME_CONFIG.musicRoom.fight;
  const event = EVENTS.musicRoomSiren;
  assert(fight.rounds.length === 6, `라운드가 6개가 아닙니다: ${fight.rounds.length}`);
  assert(fight.sirenHp >= 1, "세이렌 HP가 1 미만입니다.");
  assert(event.intro.length > 0 && event.reentry.length > 0, "인트로/재진입 대사가 비어 있습니다.");
  assert(event.outcomes.win.resultText && event.outcomes.lose.resultText, "승패 결과 대사가 없습니다.");

  for (const round of fight.rounds) {
    if (!round.dialogueId) {
      continue;
    }
    const dialogue = event.dialogues[round.dialogueId];
    assert(dialogue, `${round.dialogueId} 대화가 EVENTS에 없습니다.`);
    assert(dialogue.choices.length === 2, `${round.dialogueId} 선택지가 2개가 아닙니다.`);
    for (const choice of dialogue.choices) {
      assert(choice.label && choice.resultText, `${choice.id} 선택지에 라벨/결과 대사가 없습니다.`);
    }
  }
});

test("세이렌 아레나는 음악실 피아노와 세이렌을 모두 감싼다", () => {
  const arena = GAME_CONFIG.musicRoom.fight.arena;
  const contains = (box) => box.x >= arena.x
    && box.y >= arena.y
    && box.x + box.width <= arena.x + arena.width
    && box.y + box.height <= arena.y + arena.height;

  const siren = GAME_CONFIG.musicRoom.siren;
  assert(
    contains({ x: siren.x, y: siren.y, width: siren.size, height: siren.size }),
    "세이렌이 아레나 밖에 있습니다.",
  );
  // 위쪽 피아노 2대는 벽에 붙이려고 바닥선보다 72px 위에 그려지므로(스프라이트
  // 박스는 아레나를 벗어난다) 실제로 플레이어를 막는 충돌 박스만 검사한다.
  const controller = new GameController({
    canvas: document.createElement("canvas"),
    controls: [],
    config: GAME_CONFIG,
  });
  for (const piano of GAME_CONFIG.musicRoom.pianos) {
    assert(contains(controller.getPianoCollisionBox(piano)), `${piano.corner} 충돌 박스가 아레나 밖에 있습니다.`);
  }

  const retreat = GAME_CONFIG.musicRoom.fight.retreat;
  assert(retreat.x + GAME_CONFIG.player.size <= arena.x, "패배 후 후퇴 지점이 아레나 안이라 전투가 곧바로 재시작됩니다.");
});

test("세이렌전은 음악실에 들어서면 시작되고 전투 중에는 방을 못 나간다", () => {
  const triggered = [];
  const controller = new GameController({
    canvas: document.createElement("canvas"),
    controls: [],
    config: GAME_CONFIG,
    onSirenFightTrigger: () => triggered.push("start"),
  });
  controller.prepareMapCollision();

  const arena = GAME_CONFIG.musicRoom.fight.arena;
  const insideX = arena.x + arena.width / 2;
  const insideY = arena.y + arena.height / 2;

  controller.state.player.x = GAME_CONFIG.player.x;
  controller.state.player.y = GAME_CONFIG.player.y;
  controller.updateSirenFight(0.016);
  assert(triggered.length === 0, "음악실 밖인데 세이렌전이 시작됐습니다.");

  controller.state.player.x = insideX;
  controller.state.player.y = insideY;
  controller.updateSirenFight(0.016);
  assert(triggered.length === 1, "음악실에 들어섰는데 세이렌전이 시작되지 않았습니다.");

  controller.startSirenFight();
  assert(controller.isSirenFightActive, "세이렌전이 활성화되지 않았습니다.");
  assert(
    !controller.canPlayerOccupy(arena.x - GAME_CONFIG.player.size, insideY),
    "전투 중인데 음악실 밖으로 나갈 수 있습니다.",
  );
  assert(controller.canPlayerOccupy(insideX, insideY), "전투 중에 방 안에서 움직일 수 없습니다.");
});

test("복도에서 걸어 들어가 세이렌전이 시작돼도 플레이어가 갇히지 않는다", () => {
  // 회귀 테스트: 발판(foot point) 기준으로 전투를 시작하면 충돌 박스가 아직
  // 문턱에 걸쳐 있어서, 방을 봉쇄하는 순간 모든 방향이 막혀 그 자리에 얼어붙는다.
  const controller = new GameController({
    canvas: document.createElement("canvas"),
    controls: [],
    config: GAME_CONFIG,
    onSirenFightTrigger: () => controller.startSirenFight(),
  });
  controller.prepareMapCollision();

  const fight = GAME_CONFIG.musicRoom.fight;
  const size = GAME_CONFIG.player.size;
  // 음악실 서쪽 복도에서 출발해 한 칸씩 동쪽으로 걸어 들어간다.
  controller.state.player.x = fight.arena.x - size - 32;
  controller.state.player.y = 864;

  let steppedInside = false;
  for (let step = 0; step < 200; step += 1) {
    const moved = moveWithAxisCollisions(
      controller.state.player,
      4,
      0,
      (x, y) => controller.canPlayerOccupy(x, y),
    );
    const isStuck = moved.x === controller.state.player.x;
    controller.state.player.x = moved.x;
    controller.state.player.y = moved.y;
    controller.updateSirenFight(0.05);

    if (controller.isSirenFightActive) {
      steppedInside = true;
      assert(
        controller.canPlayerOccupy(controller.state.player.x, controller.state.player.y),
        `전투 시작 후 현재 위치(x=${controller.state.player.x})가 막혀 있어 플레이어가 갇힙니다.`,
      );
      // 전투가 시작된 뒤에도 방 안에서는 계속 움직일 수 있어야 한다.
      assert(
        controller.canPlayerOccupy(controller.state.player.x + 4, controller.state.player.y)
        || controller.canPlayerOccupy(controller.state.player.x, controller.state.player.y + 4),
        "전투 시작 후 어느 방향으로도 움직일 수 없습니다.",
      );
      break;
    }

    assert(!isStuck, `전투 시작 전인데 복도에서 막혔습니다 (x=${controller.state.player.x}).`);
  }

  assert(steppedInside, "음악실로 걸어 들어갔는데 세이렌전이 시작되지 않았습니다.");
});

test("세이렌전이 시작되면 플레이어를 방 중앙 개활지로 옮긴다", () => {
  const controller = new GameController({
    canvas: document.createElement("canvas"),
    controls: [],
    config: GAME_CONFIG,
  });
  controller.prepareMapCollision();

  const fight = GAME_CONFIG.musicRoom.fight;
  // 어느 문으로 들어왔든 상관없이 같은 자리에서 시작해야 한다.
  controller.state.player.x = fight.arena.x + 4;
  controller.state.player.y = 864;
  controller.startSirenFight();

  const start = fight.playerStart;
  assert(
    controller.state.player.x === start.x && controller.state.player.y === start.y,
    "전투 시작 위치로 이동하지 않았습니다.",
  );
  assert(
    controller.canPlayerOccupy(start.x, start.y),
    "전투 시작 위치가 막혀 있습니다(벽/피아노와 겹침).",
  );

  const startBox = controller.getPlayerCollisionBox(start.x, start.y);
  assert(controller.isBoxInsideSirenArena(startBox), "전투 시작 위치가 아레나 밖입니다.");

  const sirenBox = {
    x: GAME_CONFIG.musicRoom.siren.x,
    y: GAME_CONFIG.musicRoom.siren.y,
    width: GAME_CONFIG.musicRoom.siren.size,
    height: GAME_CONFIG.musicRoom.siren.size,
  };
  const overlapsSiren = startBox.x < sirenBox.x + sirenBox.width
    && startBox.x + startBox.width > sirenBox.x
    && startBox.y < sirenBox.y + sirenBox.height
    && startBox.y + startBox.height > sirenBox.y;
  assert(!overlapsSiren, "시작하자마자 세이렌과 겹쳐 반격 판정이 들어갑니다.");

  // 시작 지점에서 사방으로 움직일 수 있어야 한다.
  for (const [dx, dy, label] of [[48, 0, "오른쪽"], [-48, 0, "왼쪽"], [0, -48, "위"], [0, 48, "아래"]]) {
    assert(
      controller.canPlayerOccupy(start.x + dx, start.y + dy),
      `전투 시작 위치에서 ${label}으로 움직일 수 없습니다.`,
    );
  }
});

test("세이렌 반격 3번이면 승리하고, 라운드를 모두 놓치면 패배한다", () => {
  const fight = GAME_CONFIG.musicRoom.fight;
  const siren = GAME_CONFIG.musicRoom.siren;

  const runFight = ({ counterEveryStun }) => {
    const results = [];
    const controller = new GameController({
      canvas: document.createElement("canvas"),
      controls: [],
      config: GAME_CONFIG,
      onSirenFightEnd: (hasWon) => results.push(hasWon),
      onSirenDialogue: () => controller.resumeSirenFight(),
    });
    controller.prepareMapCollision();
    controller.state.player.x = fight.arena.x + 200;
    controller.state.player.y = fight.arena.y + 200;
    controller.startSirenFight();

    // 대사 이벤트에서 즉시 재개하도록 콜백을 다시 연결한다(생성 시점엔 controller가 아직 없음).
    controller.sirenFight.onDialogue = () => controller.resumeSirenFight();

    for (let step = 0; step < 4000 && results.length === 0; step += 1) {
      if (counterEveryStun && controller.sirenFight.phase === "stun") {
        controller.state.player.x = siren.x + siren.size / 2 - GAME_CONFIG.player.size / 2;
        controller.state.player.y = siren.y + siren.size / 2 - GAME_CONFIG.player.size / 2;
        controller.attemptSirenAttack();
      } else {
        controller.state.player.x = fight.arena.x + 40;
        controller.state.player.y = fight.arena.y + 40;
      }
      controller.updateSirenFight(0.05);
    }
    return { results, controller };
  };

  const won = runFight({ counterEveryStun: true });
  assert(won.results[0] === true, "반격을 계속 맞혔는데 승리하지 않았습니다.");
  assert(won.controller.sirenFightCleared, "승리 후에도 세이렌전이 클리어로 기록되지 않았습니다.");

  const lost = runFight({ counterEveryStun: false });
  assert(lost.results[0] === false, "한 번도 반격하지 않았는데 패배하지 않았습니다.");
  assert(
    lost.controller.state.player.x === fight.retreat.x,
    "패배 후 플레이어가 복도로 밀려나지 않았습니다.",
  );
});

test("세이렌에게 닿기만 해서는 반격되지 않고, 공격(스페이스) 입력이 있어야 한다", () => {
  const fight = GAME_CONFIG.musicRoom.fight;
  const siren = GAME_CONFIG.musicRoom.siren;
  const controller = new GameController({
    canvas: document.createElement("canvas"),
    controls: [],
    config: GAME_CONFIG,
  });
  controller.prepareMapCollision();
  controller.state.player.x = fight.arena.x + 200;
  controller.state.player.y = fight.arena.y + 200;
  controller.startSirenFight();

  for (let step = 0; step < 400 && controller.sirenFight.phase !== "stun"; step += 1) {
    controller.updateSirenFight(0.05);
  }
  assert(controller.sirenFight.phase === "stun", "스턴 구간까지 도달하지 못했습니다.");

  controller.state.player.x = siren.x + siren.size / 2 - GAME_CONFIG.player.size / 2;
  controller.state.player.y = siren.y + siren.size / 2 - GAME_CONFIG.player.size / 2;
  controller.updateSirenFight(0.016);
  assert(
    controller.sirenFight.sirenHp === fight.sirenHp,
    "공격 입력 없이 몸이 닿기만 했는데 반격 판정이 들어갔습니다.",
  );
  assert(controller.sirenFight.phase === "stun", "공격 없이 닿기만 했는데 phase가 바뀌었습니다.");

  const landed = controller.attemptSirenAttack();
  assert(landed === true, "스턴 중 세이렌과 겹친 상태에서 공격이 반격으로 이어지지 않았습니다.");
  assert(controller.sirenFight.sirenHp === fight.sirenHp - 1, "공격 후 세이렌 HP가 줄지 않았습니다.");
  assert(controller.sirenFight.phase === "hitPause", "공격이 landed인데 phase가 hitPause로 바뀌지 않았습니다.");

  // 스턴이 아닐 때(회피 구간)는 붙어 있어도 공격이 통하지 않는다.
  const missController = new GameController({
    canvas: document.createElement("canvas"),
    controls: [],
    config: GAME_CONFIG,
  });
  missController.prepareMapCollision();
  missController.startSirenFight();
  assert(missController.sirenFight.phase === "dodge", "테스트 전제가 깨졌습니다: 시작 phase가 dodge가 아닙니다.");
  missController.state.player.x = siren.x + siren.size / 2 - GAME_CONFIG.player.size / 2;
  missController.state.player.y = siren.y + siren.size / 2 - GAME_CONFIG.player.size / 2;
  const missed = missController.attemptSirenAttack();
  assert(missed === false, "회피 구간(스턴 아님)인데 공격이 반격으로 처리됐습니다.");
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

test("오프닝 카메라는 지정한 줌을 사용한다", () => {
  const state = createGameState(GAME_CONFIG);
  const camera = getCameraPosition(
    state.player,
    GAME_CONFIG,
    GAME_CONFIG.canvas,
    GAME_CONFIG.camera.introZoom,
  );
  assert(camera.zoom === GAME_CONFIG.camera.introZoom, "오프닝 카메라 줌이 적용되지 않았습니다.");
});

test("오프닝 연출 중 입력을 잠그고 1.8초 후 해제한다", () => {
  let revealEndCount = 0;
  const controller = new GameController({
    canvas: document.createElement("canvas"),
    controls: [],
    config: GAME_CONFIG,
    playIntroReveal: true,
    onIntroRevealEnd: () => {
      revealEndCount += 1;
    },
  });
  const startX = controller.state.player.x;

  setDirection(controller.state.input, "keyboard", "right", true);
  controller.update(GAME_CONFIG.camera.introRevealSeconds / 2);
  assert(controller.isInputLocked, "연출 중 입력 잠금이 너무 일찍 해제됐습니다.");
  assert(nearlyEqual(controller.introRevealProgress, 0.5), "오프닝 진행도가 올바르지 않습니다.");
  assert(controller.state.player.x === startX, "연출 중 플레이어가 움직였습니다.");

  controller.update(GAME_CONFIG.camera.introRevealSeconds / 2);
  assert(!controller.isInputLocked, "연출 완료 후 입력 잠금이 해제되지 않았습니다.");
  assert(controller.introRevealProgress === 1, "오프닝이 최종 상태에 도달하지 않았습니다.");
  assert(revealEndCount === 1, "오프닝 완료 콜백이 정확히 한 번 호출되지 않았습니다.");
});

test("모션 감소 환경에서는 오프닝을 즉시 최종 상태로 만든다", () => {
  const controller = new GameController({
    canvas: document.createElement("canvas"),
    controls: [],
    config: GAME_CONFIG,
    playIntroReveal: true,
    reducedMotion: true,
  });
  assert(controller.introRevealProgress === 1, "모션 감소 환경의 시야가 즉시 열리지 않았습니다.");
  assert(!controller.isIntroRevealActive, "모션 감소 환경에서 오프닝 애니메이션이 남았습니다.");
});

test("플레이어 이름은 앞뒤 공백을 제거하고 유니코드 12자로 정규화된다", () => {
  assert(normalizePlayerName("  이현🙂  ") === "이현🙂", "한글과 이모지 이름이 보존되지 않았습니다.");
  assert(Array.from(normalizePlayerName("가나다라마바사아자차카타파")).length === 12, "이름이 12자로 제한되지 않았습니다.");
});

test("진행 저장 데이터에 플레이어 이름이 포함된다", () => {
  const previousProgress = loadProgress();
  const session = {
    stats: createStats(GAME_CONFIG),
    clearedEvents: new Set(),
    inventory: new Set(),
    collectedPickups: new Set(),
    triggeredHazards: new Set(),
    playerName: "테스트요원",
  };
  saveProgress("story", { phase: "nickname", index: 7 }, session);
  const saved = loadProgress();
  assert(saved.playerName === "테스트요원", "플레이어 이름이 저장되지 않았습니다.");
  assert(saved.payload.phase === "nickname" && saved.payload.index === 7, "스토리 단계가 정규화된 형태로 저장되지 않았습니다.");
  if (previousProgress) {
    sessionStorage.setItem("sixpm:progress", JSON.stringify(previousProgress));
  } else {
    sessionStorage.removeItem("sixpm:progress");
  }
});

test("등록된 이름으로 재시작한 프롤로그를 스킵하면 닉네임 입력 없이 게임으로 이동한다", () => {
  const root = document.createElement("div");
  let destination = null;
  const scene = createStoryScene({
    root,
    session: { playerName: "재시작검증" },
    payload: { phase: "dialog", index: 0 },
    persist: () => {},
    goTo: (name, payload) => {
      destination = { name, payload };
    },
  });

  scene.mount();
  root.querySelector(".story-scene__skip").click();

  assert(root.querySelector(".story-name-form") === null, "등록된 이름이 있는데 닉네임 입력 화면이 표시됐습니다.");
  assert(destination?.name === "exploration", "튜토리얼 스킵 후 게임 화면으로 이동하지 않았습니다.");
  assert(destination?.payload?.playIntroReveal, "재시작 후 게임 진입 연출이 누락됐습니다.");
  scene.unmount();
});

test("등록된 이름이 없으면 프롤로그 스킵 후 닉네임 입력을 표시한다", () => {
  const root = document.createElement("div");
  const scene = createStoryScene({
    root,
    session: { playerName: null },
    payload: { phase: "dialog", index: 0 },
    persist: () => {},
    goTo: () => {},
  });

  scene.mount();
  root.querySelector(".story-scene__skip").click();

  assert(root.querySelector(".story-name-form") !== null, "첫 게임의 필수 닉네임 입력 화면이 표시되지 않았습니다.");
  scene.unmount();
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

test("HP/Cringe는 프레임 단위 소수 데미지가 누적돼도 부동소수점 잡음 없이 깔끔하게 남는다", () => {
  const stats = createStats(GAME_CONFIG);
  // 매 프레임 실제 경과 시간(deltaSeconds)만큼 데미지를 적용하는 상황을 흉내낸다.
  // 부동소수점 오차가 쌓이면 20.47999999999979 같은 값이 남을 수 있다.
  // 정수로 반올림하면 누적 데미지 총량 자체가 틀어지므로(예: 초당 80데미지
  // 1초가 76.8이 아닌 60으로 깎임), 소수 둘째 자리까지만 정리해 표현 오차만
  // 없애고 누적값(총 데미지)은 그대로 보존되는지 함께 확인한다.
  let expectedHp = stats.hp;
  for (let frame = 0; frame < 60; frame += 1) {
    applyHpDelta(stats, -(80 * 0.016));
    expectedHp -= 80 * 0.016;
  }
  assert(nearlyEqual(stats.hp, expectedHp, 0.01), `누적 데미지 총량이 어긋났습니다: ${stats.hp} (기대값 ${expectedHp})`);
  assert(!/\.\d{3,}/.test(String(stats.hp)), `HP에 부동소수점 잡음이 남아있습니다: ${stats.hp}`);
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

// speedrun-ranking.js now talks to the real backend, so these tests stand
// a minimal fake server in for `fetch` — same request/response contract as
// RankingController (see backend/.../ranking) — rather than hitting a live
// server or reaching into localStorage directly.
function createFakeRankingBackend() {
  const store = new Map();

  function ranksFor(endingId) {
    if (!store.has(endingId)) {
      store.set(endingId, []);
    }
    return store.get(endingId);
  }

  return async function handle(url, options) {
    const path = new URL(url, window.location.origin).pathname;

    if (options?.method === "POST" && path === "/api/rankings") {
      const body = JSON.parse(options.body);
      const list = ranksFor(body.endingId);
      const rank = list.filter((entry) => entry.clearTimeMs < body.clearTimeMs).length + 1;
      list.push({ nickname: body.nickname, clearTimeMs: body.clearTimeMs });
      return new Response(
        JSON.stringify({ nickname: body.nickname, clearTimeMs: body.clearTimeMs, rank, saved: rank <= 10 }),
        { status: 201 },
      );
    }

    const match = path.match(/^\/api\/rankings\/(.+)$/);
    if (match) {
      const top10 = [...ranksFor(match[1])].sort((a, b) => a.clearTimeMs - b.clearTimeMs).slice(0, 10);
      return new Response(JSON.stringify(top10), { status: 200 });
    }

    throw new Error(`테스트에서 처리할 수 없는 요청입니다: ${url}`);
  };
}

async function withFakeRankingBackend(run) {
  const originalFetch = window.fetch;
  window.fetch = createFakeRankingBackend();
  try {
    await run();
  } finally {
    window.fetch = originalFetch;
  }
}

test("엔딩별 랭킹은 분리되고 timeMs 오름차순 상위 10개만 저장된다", async () => {
  await withFakeRankingBackend(async () => {
    for (const [endingIndex, endingId] of ENDING_IDS.entries()) {
      await saveRanking(endingId, `엔딩${endingIndex + 1}`, 50_000 + endingIndex);
    }

    const fastest = await saveRanking("ending1", "더빠른기록", 10_000);
    assert(fastest.rank === 1, "새로 등록한 최고 기록의 순위 계산이 올바르지 않습니다.");
    for (let index = 0; index < 10; index += 1) {
      await saveRanking("ending1", `참가자${index}`, 20_000 + index);
    }

    const ending1 = await getRanking("ending1");
    assert(ending1.length === 10, "엔딩별 랭킹이 최대 10개를 초과했습니다.");
    assert(ending1[0].timeMs === 10_000, "랭킹이 timeMs 오름차순으로 정렬되지 않았습니다.");
    assert((await getRanking("ending2")).length === 1, "서로 다른 엔딩의 랭킹이 섞였습니다.");
  });
});

test("랭킹 닉네임은 HTML로 해석되지 않는다", async () => {
  await withFakeRankingBackend(async () => {
    await saveRanking("ending1", "<img src=x>", 1_000);
    const list = document.createElement("ol");
    await renderRanking("ending1", list);
    assert(list.querySelector("img") === null, "닉네임이 HTML로 삽입됐습니다.");
    assert(list.textContent.includes("<img src=x>"), "닉네임 텍스트가 보존되지 않았습니다.");
  });
});

const results = document.querySelector("#results");
let passed = 0;

for (const item of tests) {
  const result = document.createElement("li");
  try {
    await item.run();
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
