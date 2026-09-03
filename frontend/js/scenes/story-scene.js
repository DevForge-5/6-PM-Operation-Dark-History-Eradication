import { createDialogBox } from "../ui/dialog.js";

const INTRO_LINES = [
  { speaker: "17:00 / 방송부", text: "봉사활동 종료까지 한 시간. 오늘도 별일 없는 평범한 방과 후였다." },
  { speaker: "player", text: "이 파일들만 정리하면 끝... 잠깐, '중2병 다이어리'랑 '울면서 찍은 셀카'가 왜 여기 있어?" },
  { speaker: "SYSTEM", text: "전송 대상 확인. 학교 지하 '흑역사 중앙 인쇄 서버'에 데이터를 등록합니다." },
  { speaker: "SYSTEM WARNING", text: "데이터 마수화 진행 중. 18:00 정각 전국 전광판·SNS·뉴스·학교 방송망에 HD 생중계됩니다." },
  { speaker: "최지훈 / 무전", text: "이현아, 서버 이상을 감지했어. 걱정 마. 내가 무전으로 길을 안내할게." },
  { speaker: "최지훈 / 무전", text: "Time은 18:00까지, HP가 0이 되거나 Cringe가 100이 되면 작전 실패야." },
  { speaker: "최지훈 / 무전", text: "에어팟, 방지 약, 수정 테이프를 확보해. 17:55까지 지하 서버실에 도착해야 해." },
  { speaker: "player", text: "내 흑역사가 전국 생중계되는 것만은... 무슨 일이 있어도 막아야 한다." },
];

export function normalizePlayerName(value) {
  return Array.from(String(value ?? "").trim()).slice(0, 12).join("");
}

export function createStoryScene({ root, session, goTo, payload, persist }) {
  let node = null;
  let dialog = null;
  let index = Math.max(0, Math.min(payload?.index ?? 0, INTRO_LINES.length - 1));
  let phase = payload?.phase === "nickname" ? "nickname" : "dialog";

  function enterGame() {
    goTo("exploration", { playIntroReveal: true });
  }

  function showNicknameForm() {
    phase = "nickname";
    dialog?.destroy();
    dialog = null;
    node.querySelector(".story-scene__skip").hidden = true;

    const form = document.createElement("form");
    form.className = "story-name-form";
    form.innerHTML = `
      <p class="story-name-form__eyebrow">OPERATION PROFILE</p>
      <h2 class="story-name-form__title">작전 기록 등록</h2>
      <label class="story-name-form__label" for="player-name">플레이어 이름</label>
      <input id="player-name" name="playerName" class="story-name-form__input" type="text" placeholder="이름을 입력하세요" autocomplete="nickname" aria-describedby="player-name-error">
      <p id="player-name-error" class="story-name-form__error" role="alert" hidden></p>
      <button class="story-name-form__submit" type="submit">작전 시작</button>
    `;
    node.appendChild(form);
    persist?.({ phase, index });

    const input = form.elements.playerName;
    input.focus();
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const rawName = input.value.trim();
      const error = form.querySelector("#player-name-error");
      if (!rawName) {
        error.textContent = "플레이어 이름을 입력해 주세요.";
        error.hidden = false;
        input.focus();
        return;
      }
      if (Array.from(rawName).length > 12) {
        error.textContent = "플레이어 이름은 12자 이하로 입력해 주세요.";
        error.hidden = false;
        input.focus();
        return;
      }
      session.playerName = normalizePlayerName(rawName);
      persist?.({ phase, index });
      enterGame();
    });
  }

  function finishTutorial() {
    if (session.playerName) {
      enterGame();
    } else {
      showNicknameForm();
    }
  }

  function showLine() {
    const line = INTRO_LINES[index];
    dialog.show(line.text, {
      speaker: line.speaker,
      progress: `${index + 1} / ${INTRO_LINES.length}`,
      playerName: session.playerName,
    });
    persist?.({ phase: "dialog", index });
  }

  function mount() {
    node = document.createElement("section");
    node.className = "scene story-scene";
    node.setAttribute("aria-label", "인트로 스토리");
    node.innerHTML = `<button class="story-scene__skip" type="button">튜토리얼 스킵</button>`;
    root.appendChild(node);

    node.querySelector(".story-scene__skip").addEventListener("click", (event) => {
      event.stopPropagation();
      finishTutorial();
    });

    if (phase === "nickname" && !session.playerName) {
      showNicknameForm();
      return;
    }

    phase = "dialog";

    dialog = createDialogBox({ root: node });
    showLine();

    const advanceStory = () => {
      index += 1;
      if (index >= INTRO_LINES.length) {
        finishTutorial();
        return;
      }
      showLine();
    };
    dialog.setAdvanceHandler(advanceStory);
  }

  function unmount() {
    dialog?.destroy();
    dialog = null;
    node?.remove();
    node = null;
  }

  return { mount, unmount };
}
