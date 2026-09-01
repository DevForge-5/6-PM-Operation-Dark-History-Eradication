import { isCringeMaxed, isHpDepleted, isTimeUp } from "../game/game-state.js";

export const ENDINGS = Object.freeze({
  true: {
    id: "true",
    type: "True",
    title: "완벽한 사회적 생존",
    description: "18:00 전 서버 파괴에 성공했다. 무사히 하교한다.",
  },
  badBroadcast: {
    id: "badBroadcast",
    type: "Bad",
    title: "전국 생중계",
    description: "18:00 정각이 되거나 Cringe가 폭발했다. 흑역사가 전국에 생중계된다.",
  },
  badInfected: {
    id: "badInfected",
    type: "Bad",
    title: "중2병 오염",
    description: "HP가 바닥났다. 평생 붕대를 감고 학교를 떠도는 유령이 된다.",
  },
  hiddenMeme: {
    id: "hiddenMeme",
    type: "Hidden",
    title: "100만 밈 유튜버",
    description: "흑역사를 인정하는 루트를 선택해 숏폼으로 대떡상, 창업까지 성공한다.",
  },
  secretBreaker: {
    id: "secretBreaker",
    type: "Secret",
    title: "전원 차단기 신공",
    description: "경비실 두꺼비집을 내려 허무하게 사태를 종료시킨다.",
  },
});

// TODO(Day 4+): 서버실 도달/최종 보스 처치 트리거가 생기면 true 엔딩과
// hiddenMeme/secretBreaker 루트도 실제 게임 진행으로 분기하도록 확장.
export function resolveEnding(stats) {
  if (isHpDepleted(stats)) {
    return ENDINGS.badInfected;
  }

  if (isCringeMaxed(stats) || isTimeUp(stats)) {
    return ENDINGS.badBroadcast;
  }

  return ENDINGS.true;
}
