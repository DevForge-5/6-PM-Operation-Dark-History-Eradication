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
        requiresItem: "noiseCancelingEarbuds",
        effect: { cringeDelta: -20, minutesDelta: 5, resultText: "노이즈 캔슬링으로 목소리가 차단된다." },
      },
      {
        id: "counter",
        label: "[맞불] 동족인 척 중2병 대사 치기",
        type: "instant",
        effect: { cringeDelta: 15, hpDelta: 0, minutesDelta: 10, resultText: "『...나도 왼팔이 아파온다.』 그림자가 주춤한다." },
      },
      {
        id: "accept-history",
        label: "[인정] 흑역사를 내 콘텐츠로 공개하기",
        type: "instant",
        effect: {
          endingId: "ending4",
          resultText: "숨기기를 포기하고 흑역사를 숏폼으로 공개했다. 반응이... 폭발적이다!",
        },
      },
      {
        id: "power-breaker",
        label: "[지름길] 경비실 두꺼비집 내리기",
        type: "instant",
        effect: {
          endingId: "ending5",
          resultText: "두꺼비집을 내리자 학교의 모든 전원이 꺼졌다. 너무 간단하게 끝났다.",
        },
      },
    ],
  },
  musicRoomSiren: {
    id: "musicRoomSiren",
    title: "새벽 2시 감성 싸이월드 세이렌",
    intro: [
      "음악실 스피커에서 낮은 하울링이 새어 나온다.",
      "『...도토리를 건네주지 않으면, 그 시절 미니홈피를 재생하겠어.』",
    ],
    choices: [
      {
        id: "destroy",
        label: "[파괴] 앰프에 빗자루 꽂기",
        type: "instant",
        effect: { cringeDelta: -15, hpDelta: -5, minutesDelta: 8, resultText: "앰프가 스파크를 튀기며 조용해졌다. 손이 조금 저리다." },
      },
      {
        id: "persuade",
        label: "[설득] 남의 글이라고 우기기",
        type: "instant",
        effect: { cringeDelta: 10, minutesDelta: 6, resultText: "『...본인 아이디로 로그인해놓고 무슨 소리야.』 안 먹혔다." },
      },
      {
        id: "qte",
        label: "[QTE] 박자에 맞춰 Mute 파장 쏘기",
        type: "qte",
        onSuccess: { cringeDelta: -15, minutesDelta: 5, resultText: "박자에 맞춰 정확히 뮤트시켰다!" },
        onFail: { cringeDelta: 20, minutesDelta: 5, resultText: "박자를 놓쳐 하울링을 그대로 들었다..." },
      },
    ],
  },
});
