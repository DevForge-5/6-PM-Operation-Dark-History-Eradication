import { ENDINGS } from "../data/endings.js";

// Hidden/Secret endings (아이템 없이도 고를 수 있는 [인정]/[지름길] 같은
// 선택지)는 최종보스를 건너뛰는 것이 원래 의도된 지름길이므로, True/Bad
// 엔딩(시간초과·HP 소진·보스 처치)에만 적용되는 보스 완료 게이트에서 제외한다.
const BOSS_GATE_BYPASS_TYPES = new Set(["Hidden", "Secret"]);

export function canTriggerEnding(session) {
  const selectedEnding = ENDINGS[session?.selectedEndingId];
  if (selectedEnding && BOSS_GATE_BYPASS_TYPES.has(selectedEnding.type)) {
    return true;
  }
  return session?.bossBattleCompleted === true && session?.bossStoryCompleted === true;
}
