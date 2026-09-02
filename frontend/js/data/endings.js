import { isCringeMaxed, isHpDepleted, isTimeUp } from "../game/game-state.js";

export const ENDINGS = Object.freeze({
  ending1: {
    id: "ending1",
    type: "True",
    title: "완벽한 사회적 생존",
    description: "18:00 전 서버 파괴에 성공했다. 무사 하교한다.",
  },
  ending2: {
    id: "ending2",
    type: "Bad",
    title: "전국 생중계",
    description: "18:00 도달 또는 Cringe 100 도달로 전국 망신 및 이민.",
  },
  ending3: {
    id: "ending3",
    type: "Bad",
    title: "중2병 오염",
    description: "HP 0 도달로 평생 붕대를 감고 학교를 떠도는 유령화.",
  },
  ending4: {
    id: "ending4",
    type: "Hidden",
    title: "100만 밈(Meme) 유튜버",
    description: "흑역사 인정 루트 선택으로 숏폼 대떡상 및 창업 성공.",
  },
  ending5: {
    id: "ending5",
    type: "Secret",
    title: "전원 차단기 신공",
    description: "경비실 두꺼비집을 내려 허무하게 사태 종료.",
  },
});

export function resolveEnding(stats, selectedEndingId = null) {
  if (selectedEndingId === "ending4" || selectedEndingId === "ending5") {
    return ENDINGS[selectedEndingId];
  }

  if (isHpDepleted(stats)) {
    return ENDINGS.ending3;
  }

  if (isCringeMaxed(stats) || isTimeUp(stats)) {
    return ENDINGS.ending2;
  }

  return ENDINGS.ending1;
}
