export const EVENTS = Object.freeze({
  hallwayShadow: {
    id: "hallwayShadow",
    title: "왼손의 흑염룡 - 중2병 섀도우",
    intro: [
      "복도 한복판, 시커먼 그림자가 솟아올라 형체를 갖춘다.",
      "『...크큭, 봉인된 나의 왼팔이 다시 깨어날 시간인가.』",
    ],
    choices: [
      {
        id: "qte",
        label: "[QTE] 3초 내 타자 연타로 고함치기",
        type: "qte",
        onSuccess: { cringeDelta: -10, minutesDelta: 5, resultText: "기합으로 그림자를 밀어냈다!" },
        onFail: { cringeDelta: 25, minutesDelta: 5, resultText: "타이밍을 놓쳐 정신 공격을 그대로 맞았다..." },
      },
      {
        id: "item",
        label: "[아이템] 에어팟 착용",
        type: "instant",
        effect: { cringeDelta: -20, minutesDelta: 5, resultText: "노이즈 캔슬링으로 목소리가 차단된다." },
      },
      {
        id: "counter",
        label: "[맞불] 동족인 척 중2병 대사 치기",
        type: "instant",
        effect: { cringeDelta: 15, hpDelta: 0, minutesDelta: 10, resultText: "『...나도 왼팔이 아파온다.』 그림자가 주춤한다." },
      },
    ],
  },
});
