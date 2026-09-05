export const EVENTS = Object.freeze({
  hallwayShadow: {
    id: "hallwayShadow",
    title: "왼손의 흑염룡 - 중2병 섀도우",
    intro: [
      "복도 한복판, 시커먼 그림자가 솟아올라 형체를 갖춘다.",
      "『...크큭, {playerName}. 봉인된 나의 왼팔이 다시 깨어날 시간인가.』",
    ],
    choices: [
      {
        id: "qte",
        label: "[QTE] 3초 내 타자 연타로 고함치기",
        type: "qte",
        onSuccess: { cringeDelta: -10, minutesDelta: 5, resultText: "기합으로 그림자를 밀어냈다!" },
        onFail: { cringeDelta: 25, minutesDelta: 5, retry: true, resultText: "타이밍을 놓쳐 정신 공격을 그대로 맞았다..." },
      },
      {
        id: "item",
        label: "[아이템] 에어팟 착용",
        type: "instant",
        requiresItem: "noiseCancelingEarbuds",
        effect: { minutesDelta: 5, resultText: "노이즈 캔슬링으로 목소리가 차단된다." },
      },
      {
        id: "counter",
        label: "[맞불] 동족인 척 중2병 대사 치기",
        type: "instant",
        effect: { cringeDelta: 25, hpDelta: 0, minutesDelta: 10, resultText: "『...나도 왼팔이 아파온다.』 그림자가 주춤한다." },
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
  // The music-room siren is not a battle-scene encounter: it plays out in the
  // exploration scene on the real room floor (see game/siren-fight.js). These
  // lines drive the room-entry intro, the mid-fight taunts, and the outcome.
  musicRoomSiren: {
    id: "musicRoomSiren",
    title: "새벽 2시 감성 싸이월드 세이렌",
    intro: [
      "음악실 문을 열자 네 대의 피아노가 저 혼자 건반을 두드리기 시작한다.",
      "『...어서 와. 2009년 5월 3일 새벽 2시 14분의 너를, 내가 아직 기억하고 있어.』",
      "『도토리를 건네주지 않으면, 그 시절 미니홈피를 여기서 재생하겠어.』",
      "피아노에서 파장이 뿜어져 나온다. 피해야 한다! (WASD / 방향키)",
    ],
    reentry: [
      "『...또 왔구나. 이번엔 끝까지 들려줄게.』",
    ],
    dialogues: {
      taunt1: {
        lines: [
          "세이렌이 잠시 건반에서 손을 뗀다.",
          "『네 미니홈피 BGM, 아직도 그 발라드더라. 왜 안 바꿨어?』",
        ],
        choices: [
          {
            id: "destroy",
            label: "[파괴] 앰프에 빗자루 꽂기",
            resultText: "빗자루가 앰프에 꽂히며 스파크가 튄다. 파장이 눈에 띄게 느려졌다. 손이 좀 저리다.",
            effect: { hpDelta: -5, cringeDelta: -10, speedFactor: 0.82 },
          },
          {
            id: "persuade",
            label: "[설득] 남의 글이라고 우기기",
            resultText: "『...본인 아이디로 로그인해놓고 무슨 소리야.』 안 먹혔다. 오히려 신났다.",
            effect: { cringeDelta: 12, speedFactor: 1.1 },
          },
        ],
      },
      taunt2: {
        lines: [
          "세이렌의 목소리가 한 옥타브 올라간다.",
          "『다음 곡은 네가 직접 작사한 거야. 제목이... 「영원의 밤을 걷는 늑대」였나?』",
        ],
        choices: [
          {
            id: "acorn",
            label: "[아부] 도토리 5개 선물하기",
            resultText: "선물함을 확인하러 간 사이 파장이 흐트러졌다. 지갑은 아프지만 효과는 있다.",
            effect: { cringeDelta: 5, speedFactor: 0.75 },
          },
          {
            id: "report",
            label: "[강수] BGM 저작권 신고하기",
            resultText: "『...신고? 신고했다고?!』 격분한 세이렌의 파장이 훨씬 빨라졌다.",
            effect: { cringeDelta: -12, speedFactor: 1.25 },
          },
        ],
      },
    },
    outcomes: {
      win: {
        minutesDelta: 8,
        resultText: "세 번째 일격에 세이렌이 무너진다. 피아노들이 조용해지고, 그 시절 새벽 2시가 드디어 닫혔다.",
      },
      lose: {
        hpDelta: -10,
        cringeDelta: 20,
        minutesDelta: 6,
        resultText: "끝내 반격하지 못하고 복도로 밀려났다. 등 뒤에서 발라드 전주가 계속 흘러나온다...",
      },
    },
  },
});
