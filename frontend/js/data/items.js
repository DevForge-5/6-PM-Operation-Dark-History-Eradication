// TODO(Day 4+): 탐색 중 습득/사용 UI(인벤토리)가 생기면 여기 정의를 그대로 연결.
export const ITEMS = Object.freeze({
  cringeRelief: {
    id: "cringeRelief",
    name: "손발 오그라듦 방지 약",
    description: "Cringe 수치를 회복시킨다.",
    effect: { cringeDelta: -20 },
  },
  noiseCancelingEarbuds: {
    id: "noiseCancelingEarbuds",
    name: "노이즈 캔슬링 에어팟",
    description: "대사형 정신 공격을 차단한다.",
    effect: { cringeDelta: -20 },
  },
  correctionTape: {
    id: "correctionTape",
    name: "흑역사 수정 테이프",
    description: "텍스트형 빔 공격을 완전히 소멸시킨다.",
    effect: { cringeDelta: -30 },
  },
  magicWand: {
    id: "magicWand",
    name: "마법봉",
    description: "미믹을 쓰러뜨리고 얻은 보상.",
    effect: {},
  },
});
