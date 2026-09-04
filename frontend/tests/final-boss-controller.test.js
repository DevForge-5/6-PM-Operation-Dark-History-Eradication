import { FinalBossController, FINAL_BOSS_PHASE, circlesOverlap } from "../js/game/final-boss-controller.js?v=4";
import { canTriggerEnding } from "../js/game/ending-flow.js?v=4";

function assert(condition, message = "assertion failed") {
  if (!condition) throw new Error(message);
}

const context = new Proxy({}, { get: (_, key) => key === "measureText" ? () => ({ width: 0 }) : () => {} });
const canvas = { width: 1024, height: 576, getContext: () => context };

function createController() {
  return new FinalBossController({
    canvas,
    config: {},
    stats: { hp: 100, hpMax: 100 },
    images: {},
  });
}

assert(circlesOverlap({ x: 0, y: 0, radius: 5 }, { x: 9, y: 0, radius: 5 }));
assert(!circlesOverlap({ x: 0, y: 0, radius: 5 }, { x: 11, y: 0, radius: 5 }));
assert(!canTriggerEnding({ bossBattleCompleted: true, bossStoryCompleted: false }), "후일담 전에는 엔딩이 차단되어야 합니다.");
assert(canTriggerEnding({ bossBattleCompleted: true, bossStoryCompleted: true }), "보스전과 후일담 완료 후 엔딩이 허용되어야 합니다.");

const damageTest = createController();
damageTest.damagePlayer(15);
damageTest.damagePlayer(15);
assert(damageTest.stats.hp === 85, "피격 무적 시간 동안 연속 피해가 들어가면 안 됩니다.");
damageTest.player.invulnerable = 0;
damageTest.damagePlayer(15);
assert(damageTest.stats.hp === 70);

const armorTest = createController();
armorTest.player.x = armorTest.boss.x;
armorTest.player.y = armorTest.boss.y;
armorTest.attack();
assert(armorTest.boss.hp === 100, "약점이 닫힌 보스에게 피해가 들어가면 안 됩니다.");
armorTest.boss.vulnerable = 1;
armorTest.player.attackCooldown = 0;
armorTest.attack();
assert(armorTest.boss.hp === 87.5, "약점이 열린 보스는 피해를 받아야 합니다.");

const phaseTest = createController();
phaseTest.player.x = phaseTest.boss.x;
phaseTest.player.y = phaseTest.boss.y;
for (let index = 0; index < 2; index += 1) {
  phaseTest.boss.vulnerable = 1;
  phaseTest.player.attackCooldown = 0;
  phaseTest.attack();
}
assert(phaseTest.phase === FINAL_BOSS_PHASE.PROJECTILES, "75%에서 Phase 2로 전환되어야 합니다.");
phaseTest.projectiles.push({ life: 1 });
phaseTest.waves.push({ life: 1 });
for (let index = 0; index < 2; index += 1) {
  phaseTest.boss.vulnerable = 1; phaseTest.player.attackCooldown = 0; phaseTest.attack();
}
assert(phaseTest.phase === FINAL_BOSS_PHASE.OVERLOAD, "50%에서 Phase 3으로 전환되어야 합니다.");
assert(phaseTest.projectiles.length === 0, "페이즈 전환 시 이전 투사체를 정리해야 합니다.");
assert(phaseTest.waves.length === 0, "페이즈 전환 시 이전 파동을 정리해야 합니다.");
for (let index = 0; index < 2; index += 1) {
  phaseTest.boss.vulnerable = 1; phaseTest.player.attackCooldown = 0; phaseTest.attack();
}
assert(phaseTest.phase === FINAL_BOSS_PHASE.FINAL, "25%에서 Phase 4로 전환되어야 합니다.");
for (let index = 0; index < 3; index += 1) {
  phaseTest.boss.vulnerable = 1; phaseTest.player.attackCooldown = 0; phaseTest.attack();
}
assert(phaseTest.phase === FINAL_BOSS_PHASE.DEFEATED, "Phase 4 체력이 0이면 패배 연출 상태가 되어야 합니다.");

const reflectTest = createController();
reflectTest.phase = FINAL_BOSS_PHASE.PROJECTILES;
reflectTest.projectiles.push({ x: reflectTest.player.x + 10, y: reflectTest.player.y, vx: 0, vy: 0, radius: 14, special: true, reflected: false, homing: 0, life: 3 });
reflectTest.attack();
assert(reflectTest.projectiles[0].reflected, "특수 투사체는 공격 키로 반사되어야 합니다.");

let defeatCalls = 0;
const defeatTest = new FinalBossController({ canvas, config: {}, stats: { hp: 100, hpMax: 100 }, images: {}, onDefeat: () => { defeatCalls += 1; } });
defeatTest.projectiles.push({ life: 1 });
defeatTest.defeat();
defeatTest.update(2.3);
defeatTest.update(1);
assert(defeatCalls === 1, "보스 패배 완료 콜백은 한 번만 호출되어야 합니다.");
assert(defeatTest.projectiles.length === 0, "보스 패배 시 공격 오브젝트를 모두 제거해야 합니다.");

document.querySelector("#result").textContent = "통과: 최종 보스 컨트롤러 테스트";
document.querySelector("#result").dataset.passed = "true";
