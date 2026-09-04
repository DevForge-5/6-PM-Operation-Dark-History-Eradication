import { FinalBossController, FINAL_BOSS_PHASE } from "../game/final-boss-controller.js";
import { applyHpDelta, isHpDepleted } from "../game/game-state.js";
import { setGameTimerPaused } from "../game/game-timer.js";
import { audioManager } from "../audio/audio-manager.js";

const INTRO_LINES = [
  ["흑화 최지훈", "여기까지 올 줄은 몰랐네. 이미 서버는 네 흑역사를 읽기 시작했어."],
  ["주인공", "방송되기 전에 전부 지울 거야."],
  ["흑화 최지훈", "그럼 직접 증명해 봐. 이 데이터 폭풍 속에서."],
];

const OUTRO_LINES = [
  ["흑화 최지훈", "멈췄군… 네가 과거를 없앤 게 아니라, 마주 볼 용기를 낸 거야."],
  ["주인공", "흑역사는 남아도 돼. 전국 방송만 아니면."],
  ["흑화 최지훈", "서버 연결을 끊었다. 이제 마지막 선택은 네 기록이 결정할 거야."],
];

function loadImage(source) {
  const image = new Image();
  image.src = source;
  return image;
}

export function createFinalBossScene({ root, config, session, payload, goTo, persist }) {
  let node = null;
  let controller = null;
  let transitionTimer = null;
  let phaseTransitionTimer = null;
  let hasFinishedBattle = false;
  let isPauseOpen = false;

  function setOverlay(title, subtitle = "", visible = true) {
    const overlay = node.querySelector(".final-boss-transition");
    overlay.querySelector("strong").textContent = title;
    overlay.querySelector("span").textContent = subtitle;
    overlay.hidden = !visible;
  }

  function showDialogue(lines, onDone) {
    let index = 0;
    const panel = node.querySelector(".final-boss-dialogue");
    const speaker = panel.querySelector("strong");
    const text = panel.querySelector("p");
    panel.hidden = false;
    controller?.setPaused(true);
    const render = () => {
      speaker.textContent = lines[index][0];
      text.textContent = lines[index][1];
    };
    panel.onclick = () => {
      index += 1;
      if (index < lines.length) render();
      else {
        panel.hidden = true;
        panel.onclick = null;
        onDone();
      }
    };
    render();
  }

  function beginBattle() {
    setOverlay("「17:57」", "서버 연결 종료까지 3분", true);
    audioManager.playSfx("boss_appear");
    transitionTimer = window.setTimeout(() => {
      setOverlay("", "", false);
      controller.start();
    }, 1700);
  }

  function handlePhaseChange(phase) {
    node.dataset.phase = String(phase);
    const label = node.querySelector(".final-boss-hud__phase");
    if (phase <= 4) label.textContent = `PHASE ${phase} / 4`;
    if (phase === FINAL_BOSS_PHASE.FINAL) {
      controller.setPaused(true);
      audioManager.setBgmPaused(true);
      setOverlay("「17:59」", "마지막 하나만 지우면 끝이야.", true);
      audioManager.playSfx("screen_glitch");
      phaseTransitionTimer = window.setTimeout(() => {
        setOverlay("", "", false);
        audioManager.setBgmPaused(false);
        controller.setPaused(false);
      }, 2200);
    }
    if (phase === FINAL_BOSS_PHASE.DEFEATED) {
      node.classList.add("is-boss-defeated");
      audioManager.playSfx("screen_glitch");
      audioManager.setBgmPaused(true);
    }
  }

  function handleUpdate(snapshot) {
    const hp = Math.max(0, snapshot.bossHp / snapshot.bossMaxHp * 100);
    node.querySelector(".final-boss-hud__fill").style.width = `${hp}%`;
    node.querySelector(".final-boss-hud__weakness").textContent = snapshot.vulnerable ? "CORE OPEN — SPACE / E" : "공격 패턴을 피하고 약점을 기다리세요";
    node.querySelector(".final-boss-player-hp").textContent = `HP ${Math.ceil(snapshot.playerHp)} / ${session.stats.hpMax}`;
    if (isHpDepleted(session.stats)) showRetry();
  }

  function showRetry() {
    if (node.querySelector(".final-boss-retry").hidden === false) return;
    controller.setPaused(true);
    setGameTimerPaused(true);
    audioManager.setBgmPaused(true);
    audioManager.playSfx("game_over");
    node.querySelector(".final-boss-retry").hidden = false;
  }

  function retry() {
    applyHpDelta(session.stats, session.stats.hpMax);
    session.bossBattleStarted = true;
    session.bossBattleCompleted = false;
    session.bossFinalStoryStarted = false;
    session.bossStoryCompleted = false;
    node.classList.remove("is-boss-defeated");
    node.querySelector(".final-boss-retry").hidden = true;
    controller.reset();
    controller.setPaused(false);
    setGameTimerPaused(false);
    audioManager.setBgmPaused(false);
    persist?.({ checkpoint: "battle" });
  }

  function finishBattle() {
    if (hasFinishedBattle) return;
    hasFinishedBattle = true;
    session.bossBattleCompleted = true;
    session.bossFinalStoryStarted = true;
    persist?.({ checkpoint: "outro" });
    window.setTimeout(() => {
      node.classList.remove("is-boss-defeated");
      audioManager.setBgmPaused(false);
      showDialogue(OUTRO_LINES, showSixOClock);
    }, 500);
  }

  function showSixOClock() {
    session.bossStoryCompleted = true;
    persist?.({ checkpoint: "complete" });
    setGameTimerPaused(true);
    audioManager.setBgmPaused(true);
    setOverlay("「18:00」", "", true);
    transitionTimer = window.setTimeout(() => goTo("ending"), 2200);
  }

  function togglePause() {
    if (hasFinishedBattle || !controller) return;
    isPauseOpen = !isPauseOpen;
    node.querySelector(".final-boss-pause").hidden = !isPauseOpen;
    controller.setPaused(isPauseOpen);
    setGameTimerPaused(isPauseOpen);
    audioManager.setBgmPaused(isPauseOpen);
  }

  function handleKey(event) {
    if (event.code === "Escape") {
      event.preventDefault();
      togglePause();
    }
  }

  function mount() {
    node = document.createElement("main");
    node.className = "scene final-boss-scene";
    node.innerHTML = `
      <section class="final-boss-stage" aria-label="최종 보스전">
        <canvas width="1024" height="576" aria-label="WASD 또는 방향키로 이동하고 Space 또는 E로 공격"></canvas>
        <header class="final-boss-hud">
          <div><span class="final-boss-hud__phase">PHASE 1 / 4</span><strong>흑화 최지훈</strong></div>
          <div class="final-boss-hud__bar"><span class="final-boss-hud__fill"></span></div>
          <p class="final-boss-hud__weakness">공격 패턴을 피하고 약점을 기다리세요</p>
        </header>
        <p class="final-boss-player-hp">HP ${session.stats.hp} / ${session.stats.hpMax}</p>
        <p class="final-boss-controls">이동 WASD / 방향키 · 공격/반사 SPACE / E · ESC 일시정지</p>
        <section class="final-boss-dialogue" hidden><strong></strong><p></p><small>클릭하여 계속</small></section>
        <section class="final-boss-transition" hidden><strong></strong><span></span></section>
        <section class="final-boss-pause" hidden><h2>PAUSED</h2><button type="button" data-action="resume">재개</button><button type="button" data-action="home">홈으로</button></section>
        <section class="final-boss-retry" hidden><h2>MISSION FAILED</h2><p>최종 보스 직전부터 다시 시도합니다.</p><button type="button" data-action="retry">재도전</button><button type="button" data-action="home">홈으로</button></section>
      </section>`;
    root.appendChild(node);

    controller = new FinalBossController({
      canvas: node.querySelector("canvas"),
      config: config.finalBossBattle,
      stats: session.stats,
      images: {
        player: Object.fromEntries(Object.entries(config.assets.player).map(([direction, source]) => [direction, loadImage(source)])),
        boss: loadImage(config.assets.finalBoss),
        magic: loadImage(config.assets.finalBossMagic),
      },
      onDamage: () => audioManager.playSfx("damage"),
      onPhaseChange: handlePhaseChange,
      onDefeat: finishBattle,
      onUpdate: handleUpdate,
    });

    node.addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "retry") retry();
      if (action === "resume") togglePause();
      if (action === "home") goTo("title");
    });
    window.addEventListener("keydown", handleKey);
    if (session.bossStoryCompleted) {
      showSixOClock();
    } else if (session.bossBattleCompleted || payload?.checkpoint === "outro") {
      hasFinishedBattle = true;
      session.bossFinalStoryStarted = true;
      showDialogue(OUTRO_LINES, showSixOClock);
    } else {
      applyHpDelta(session.stats, session.stats.hpMax);
      session.bossBattleStarted = true;
      persist?.({ checkpoint: "intro" });
      showDialogue(INTRO_LINES, beginBattle);
    }
  }

  function unmount() {
    window.clearTimeout(transitionTimer);
    window.clearTimeout(phaseTransitionTimer);
    window.removeEventListener("keydown", handleKey);
    controller?.destroy();
    controller = null;
    setGameTimerPaused(false);
    audioManager.setBgmPaused(false);
    node?.remove();
  }

  return { mount, unmount };
}
