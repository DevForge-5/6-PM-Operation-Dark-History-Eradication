import { ENDINGS } from "../data/endings.js";
import { ENDING_IDS, getRanking } from "../api/speedrun-ranking.js";
import { formatTime } from "../game/game-timer.js";

function createRankRow(entry, index) {
  const item = document.createElement("li");
  const position = document.createElement("span");
  const nickname = document.createElement("span");
  const time = document.createElement("span");

  position.className = "leaderboard-rank__position";
  nickname.className = "leaderboard-rank__nickname";
  time.className = "leaderboard-rank__time";
  position.textContent = `${index + 1}위`;
  nickname.textContent = entry.nickname;
  time.textContent = formatTime(entry.timeMs);
  item.append(position, nickname, time);
  return item;
}

function showListMessage(list, message) {
  list.replaceChildren();
  const item = document.createElement("li");
  item.className = "leaderboard-rank__empty";
  item.textContent = message;
  list.appendChild(item);
}

function renderRanks(list, rankings, limit) {
  const visibleRanks = rankings.slice(0, limit);
  if (visibleRanks.length === 0) {
    showListMessage(list, "아직 등록된 기록이 없습니다.");
    return;
  }

  list.replaceChildren();
  visibleRanks.forEach((entry, index) => list.appendChild(createRankRow(entry, index)));
}

async function populateRanks(list, endingId, limit) {
  showListMessage(list, "불러오는 중…");
  try {
    const rankings = await getRanking(endingId);
    renderRanks(list, rankings, limit);
  } catch (error) {
    showListMessage(list, "랭킹을 불러오지 못했습니다.");
  }
}

export function createLeaderboardScene({ root, goTo }) {
  let node = null;
  let handleClick = null;
  let selectedEndingId = null;

  function showDetail(endingId) {
    selectedEndingId = endingId;
    const ending = ENDINGS[endingId];
    const overview = node.querySelector("[data-role='leaderboard-overview']");
    const detail = node.querySelector("[data-role='leaderboard-detail']");
    const title = detail.querySelector("[data-role='detail-title']");
    const type = detail.querySelector("[data-role='detail-type']");

    type.textContent = `[${ending.type}]`;
    type.dataset.endingType = ending.type.toLowerCase();
    title.textContent = ending.title;
    populateRanks(detail.querySelector("[data-role='detail-ranking']"), endingId, 10);
    overview.hidden = true;
    detail.hidden = false;
    detail.querySelector("[data-action='back']").focus();
  }

  function showOverview() {
    selectedEndingId = null;
    node.querySelector("[data-role='leaderboard-detail']").hidden = true;
    node.querySelector("[data-role='leaderboard-overview']").hidden = false;
    node.querySelector(".leaderboard-card").focus();
  }

  function mount() {
    node = document.createElement("section");
    node.className = "scene leaderboard-scene";
    node.setAttribute("aria-label", "엔딩별 스피드런 리더보드");
    node.innerHTML = `
      <div class="leaderboard-shell" data-role="leaderboard-overview">
        <header class="leaderboard-header">
          <div>
            <p>6PM SPEEDRUN ARCHIVE</p>
            <h1>LEADERBOARD</h1>
          </div>
          <button type="button" class="leaderboard-back" data-action="back">BACK</button>
        </header>
        <div class="leaderboard-grid" data-role="leaderboard-grid"></div>
      </div>
      <div class="leaderboard-shell leaderboard-detail" data-role="leaderboard-detail" hidden>
        <header class="leaderboard-header">
          <div>
            <p class="leaderboard-detail__type" data-role="detail-type"></p>
            <h1 data-role="detail-title"></h1>
          </div>
          <button type="button" class="leaderboard-back" data-action="back">BACK</button>
        </header>
        <ol class="leaderboard-detail__ranking" data-role="detail-ranking" aria-label="상위 10개 기록"></ol>
      </div>
    `;
    root.appendChild(node);

    const grid = node.querySelector("[data-role='leaderboard-grid']");
    for (const endingId of ENDING_IDS) {
      const ending = ENDINGS[endingId];
      const card = document.createElement("button");
      const type = document.createElement("span");
      const title = document.createElement("strong");
      const list = document.createElement("ol");

      card.type = "button";
      card.className = `leaderboard-card leaderboard-card--${ending.type.toLowerCase()}`;
      card.dataset.action = "detail";
      card.dataset.endingId = endingId;
      type.className = "leaderboard-card__type";
      title.className = "leaderboard-card__title";
      list.className = "leaderboard-card__ranking";
      type.textContent = `[${ending.type}]`;
      title.textContent = ending.title;
      populateRanks(list, endingId, 3);
      card.append(type, title, list);
      grid.appendChild(card);
    }

    handleClick = (event) => {
      const actionNode = event.target.closest("[data-action]");
      if (!actionNode) {
        return;
      }

      if (actionNode.dataset.action === "detail") {
        showDetail(actionNode.dataset.endingId);
      } else if (actionNode.dataset.action === "back") {
        if (selectedEndingId) {
          showOverview();
        } else {
          goTo("title");
        }
      }
    };
    node.addEventListener("click", handleClick);
  }

  function unmount() {
    node?.removeEventListener("click", handleClick);
    node?.remove();
    node = null;
  }

  return { mount, unmount };
}
