import { applyHpDelta, isHpDepleted } from "../game/game-state.js";
import { audioManager } from "../audio/audio-manager.js";
import { ITEMS } from "../data/items.js";
import { createPauseOverlay } from "../ui/pause-overlay.js";

function setSpriteFrame(node, source, frameCount, frameIndex) {
  node.style.backgroundImage = `url("${source}")`;
  if (frameCount > 1) {
    node.style.backgroundSize = `${frameCount * 100}% 100%`;
    node.style.backgroundPosition = `${(frameIndex / (frameCount - 1)) * 100}% 0`;
  } else {
    node.style.backgroundSize = "contain";
    node.style.backgroundPosition = "center";
  }
}

function createHpPanel({ root, label, decimals = 0 }) {
  const node = document.createElement("div");
  node.className = "mimic-battle__panel";
  node.innerHTML = `
    <div class="mimic-battle__panel-name"></div>
    <div class="mimic-battle__hp-row">
      <span class="mimic-battle__heart">&#9829;</span>
      <div class="mimic-battle__hp-bar"><div class="mimic-battle__hp-fill"></div></div>
      <span class="mimic-battle__hp-text"></span>
    </div>
  `;
  root.appendChild(node);
  node.querySelector(".mimic-battle__panel-name").textContent = label;
  const fill = node.querySelector(".mimic-battle__hp-fill");
  const text = node.querySelector(".mimic-battle__hp-text");

  function update(hp, hpMax) {
    const ratio = hpMax > 0 ? Math.min(Math.max(hp / hpMax, 0), 1) : 0;
    fill.style.width = `${ratio * 100}%`;
    const displayHp = Math.max(0, hp);
    text.textContent = `${decimals > 0 ? displayHp.toFixed(decimals) : Math.round(displayHp)} / ${hpMax}`;
  }

  return { node, update };
}

function createMessageBox({ root, isPaused }) {
  const node = document.createElement("div");
  node.className = "mimic-battle__message-box";
  root.appendChild(node);
  let advanceHandler = null;

  function handleClick(event) {
    if (!advanceHandler || isPaused() || event.target.closest("[data-mimic-button]")) {
      return;
    }
    advanceHandler();
  }

  function handleKeyDown(event) {
    if (!["Space", "Enter"].includes(event.code) || event.repeat || !advanceHandler || isPaused()) {
      return;
    }
    if (event.target instanceof HTMLButtonElement) {
      return;
    }
    event.preventDefault();
    advanceHandler();
  }

  node.addEventListener("click", handleClick);
  window.addEventListener("keydown", handleKeyDown);

  function clear() {
    advanceHandler = null;
    node.innerHTML = "";
    node.classList.remove("mimic-battle__message-box--menu");
  }

  function showMessage(text, onAdvance) {
    clear();
    advanceHandler = onAdvance ?? null;
    const textEl = document.createElement("p");
    textEl.className = "mimic-battle__message-text";
    textEl.textContent = text;
    node.appendChild(textEl);
  }

  function showChoice(text, buttons) {
    clear();
    node.classList.add("mimic-battle__message-box--menu");
    const textEl = document.createElement("p");
    textEl.className = "mimic-battle__message-text mimic-battle__message-text--choice";
    textEl.textContent = text;
    node.appendChild(textEl);

    const list = document.createElement("div");
    list.className = "mimic-battle__choice-list";
    for (const buttonDef of buttons) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.mimicButton = "true";
      button.className = "mimic-battle__choice-button";
      button.textContent = buttonDef.label;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (!isPaused()) {
          buttonDef.onClick();
        }
      });
      list.appendChild(button);
    }
    node.appendChild(list);
  }

  function showFightMenu({ onBack, onAttack, onDefend, onWarmup }) {
    clear();
    node.classList.add("mimic-battle__message-box--menu");

    const inertLabel = document.createElement("span");
    inertLabel.className = "mimic-battle__fight-label";
    inertLabel.textContent = "싸운다";
    node.appendChild(inertLabel);

    const grid = document.createElement("div");
    grid.className = "mimic-battle__fight-grid";

    const buttonDefs = [
      { label: "돌아가기", onClick: onBack },
      { label: "때리기", hoverLabel: "데미지 25", onClick: onAttack },
      { label: "워밍업", hoverLabel: "회피율 +20%", onClick: onWarmup },
      { label: "방어", hoverLabel: "다음 공격 무시", onClick: onDefend },
    ];
    for (const buttonDef of buttonDefs) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.mimicButton = "true";
      button.className = "mimic-battle__fight-button";
      button.textContent = buttonDef.label;
      if (buttonDef.hoverLabel) {
        button.addEventListener("mouseenter", () => {
          button.textContent = buttonDef.hoverLabel;
        });
        button.addEventListener("mouseleave", () => {
          button.textContent = buttonDef.label;
        });
      }
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (!isPaused()) {
          buttonDef.onClick();
        }
      });
      grid.appendChild(button);
    }
    node.appendChild(grid);
  }

  function destroy() {
    node.removeEventListener("click", handleClick);
    window.removeEventListener("keydown", handleKeyDown);
    advanceHandler = null;
    node.remove();
  }

  return { node, showMessage, showChoice, showFightMenu, destroy };
}

export function createMimicBattleScene({ root, config, session, payload, goTo, persist }) {
  const { mimicMaxHp, playerAttackDamage, mimicAttackDamage, warmupEvasionBonus, rewardItemId } = config.mimicBattle;
  const { mouthOpenFrameCount, deathFrameCount } = config.mimicBattle;
  const assets = config.assets.mimicBattle;
  const playerName = session.playerName || "신이현";

  let node = null;
  let messageBox = null;
  let mimicSprite = null;
  let mimicPanel = null;
  let playerPanel = null;

  let mimicHp = payload?.mimicHp ?? mimicMaxHp;
  let isDefending = false;
  let evasionBonus = payload?.evasionBonus ?? 0;
  let mimicDefeated = false;
  let isPaused = false;
  let pauseOverlay = null;

  function setPaused(next) {
    if (next === isPaused) {
      return;
    }
    isPaused = next;
    if (isPaused) {
      pauseOverlay = createPauseOverlay({
        root: node,
        onResume: () => setPaused(false),
        onHome: () => goTo("title", { preservePlayerName: true }),
      });
    } else {
      pauseOverlay?.destroy();
      pauseOverlay = null;
    }
  }

  function handlePauseKey(event) {
    if (event.code !== "Escape") {
      return;
    }
    event.preventDefault();
    setPaused(!isPaused);
  }

  function returnToExploration() {
    goTo("exploration", { player: payload?.player });
  }

  function persistBattleState() {
    persist?.({ player: payload?.player, phase: "battle", mimicHp, evasionBonus });
  }

  function showIntro() {
    persist?.({ player: payload?.player });
    messageBox.showMessage("앗! 야생의 미믹(이)가 나타났다!", showPrompt);
  }

  function showPrompt() {
    if (isHpDepleted(session.stats)) {
      goTo("ending");
      return;
    }
    persistBattleState();
    messageBox.showChoice(`${playerName}는(은) 무엇을 할까?`, [
      { label: "싸운다", onClick: showFightMenu },
      { label: "도망간다", onClick: handleFlee },
    ]);
  }

  function handleFlee() {
    audioManager.playSfx("qte_fail");
    messageBox.showMessage(`${playerName}는(은) 도망칠 수 없었다...`, showPrompt);
  }

  function showFightMenu() {
    messageBox.showFightMenu({
      onBack: showPrompt,
      onAttack: handleAttack,
      onDefend: handleDefend,
      onWarmup: handleWarmup,
    });
  }

  function handleAttack() {
    messageBox.showMessage(`${playerName}의 때리기!`, () => {
      setMimicSprite("attack");
      mimicHp = Math.max(0, mimicHp - playerAttackDamage);
      mimicPanel.update(mimicHp, mimicMaxHp);
      audioManager.playSfx("damage");
      messageBox.showMessage(`${playerName}는(은) 미믹에게 ${playerAttackDamage} 데미지를 입혔다!`, () => {
        if (mimicHp <= 0) {
          startDefeatSequence();
        } else {
          setMimicSprite("idle");
          startMimicTurn();
        }
      });
    });
  }

  function handleDefend() {
    messageBox.showMessage(`${playerName}의 방어!`, () => {
      isDefending = true;
      messageBox.showMessage(`${playerName}는(은) 방어 자세를 취했다!`, startMimicTurn);
    });
  }

  function handleWarmup() {
    messageBox.showMessage(`${playerName}의 워밍업!`, () => {
      evasionBonus += warmupEvasionBonus;
      messageBox.showMessage(`${playerName}는(은) 회피율이 ${warmupEvasionBonus}% 증가했다!`, startMimicTurn);
    });
  }

  function startMimicTurn() {
    setMimicSprite("attack");
    messageBox.showMessage("미믹의 물기!", () => {
      const dodged = Math.random() * 100 < evasionBonus;
      const defended = isDefending;
      isDefending = false;

      if (dodged) {
        messageBox.showMessage("하지만 빗나가고 말았다!", () => {
          messageBox.showMessage(`${playerName}는(은) 공격을 회피했다!`, finishMimicTurn);
        });
        return;
      }

      if (defended) {
        messageBox.showMessage(`${playerName}는(은) 공격을 막았다!`, finishMimicTurn);
        return;
      }

      applyHpDelta(session.stats, -mimicAttackDamage);
      updatePlayerPanel();
      audioManager.playSfx("damage");
      messageBox.showMessage(`미믹은 ${playerName}에게 ${mimicAttackDamage} 데미지를 입혔다!`, finishMimicTurn);
    });
  }

  function finishMimicTurn() {
    setMimicSprite("idle");
    showPrompt();
  }

  function startDefeatSequence() {
    mimicDefeated = true;
    setMimicSprite("defeat");
    audioManager.playSfx("mission_clear");
    messageBox.showMessage("미믹은 쓰러졌다.", () => {
      session.inventory.add(rewardItemId);
      session.clearedEvents.add("mimicBattle");
      persist?.({ player: payload?.player, phase: "battle", mimicHp, evasionBonus });
      messageBox.showMessage(`${playerName}는(은) 보상으로 ${ITEMS[rewardItemId]?.name ?? rewardItemId}을(를) 획득했다!`, returnToExploration);
    });
  }

  function updatePlayerPanel() {
    playerPanel.update(session.stats.hp, session.stats.hpMax);
  }

  function setMimicSprite(state) {
    if (state === "attack") {
      setSpriteFrame(mimicSprite, assets.mimicAttack, mouthOpenFrameCount, mouthOpenFrameCount - 1);
    } else if (state === "defeat") {
      setSpriteFrame(mimicSprite, assets.mimicDefeat, deathFrameCount, deathFrameCount - 1);
    } else {
      setSpriteFrame(mimicSprite, assets.mimicIdle, 1, 0);
    }
  }

  function mount() {
    node = document.createElement("section");
    node.className = "scene mimic-battle-scene";
    node.style.backgroundImage = `url("${assets.background}")`;
    root.appendChild(node);
    window.addEventListener("keydown", handlePauseKey);

    const stage = document.createElement("div");
    stage.className = "mimic-battle__stage";
    node.appendChild(stage);

    mimicPanel = createHpPanel({ root: stage, label: "미믹" });
    mimicPanel.node.classList.add("mimic-battle__panel--mimic");
    mimicPanel.update(mimicHp, mimicMaxHp);

    mimicSprite = document.createElement("div");
    mimicSprite.className = "mimic-battle__sprite mimic-battle__sprite--mimic";
    stage.appendChild(mimicSprite);
    setMimicSprite(mimicHp <= 0 ? "defeat" : "idle");

    const playerSprite = document.createElement("div");
    playerSprite.className = "mimic-battle__sprite mimic-battle__sprite--player";
    setSpriteFrame(playerSprite, config.assets.player.down, config.player.animationFrameCount, 0);
    stage.appendChild(playerSprite);

    playerPanel = createHpPanel({ root: stage, label: playerName, decimals: 2 });
    playerPanel.node.classList.add("mimic-battle__panel--player");
    updatePlayerPanel();

    messageBox = createMessageBox({ root: node, isPaused: () => isPaused });
    audioManager.playSfx("warning");
    if (payload?.phase === "battle") {
      showPrompt();
    } else {
      showIntro();
    }
  }

  function unmount() {
    window.removeEventListener("keydown", handlePauseKey);
    pauseOverlay?.destroy();
    pauseOverlay = null;
    messageBox?.destroy();
    messageBox = null;
    node?.remove();
    node = null;
  }

  return { mount, unmount };
}
