import { ENDINGS } from "../data/endings.js";
import { formatTime } from "../game/game-timer.js";
import { getRanking, saveRanking } from "../api/speedrun-ranking.js";

function showRankingMessage(rankingList, message) {
  rankingList.replaceChildren();
  const item = document.createElement("li");
  item.className = "result-screen__rank-empty";
  item.textContent = message;
  rankingList.appendChild(item);
}

export async function renderRanking(endingId, rankingList) {
  showRankingMessage(rankingList, "불러오는 중…");

  let rankings;
  try {
    rankings = await getRanking(endingId);
  } catch (error) {
    showRankingMessage(rankingList, "랭킹을 불러오지 못했습니다.");
    return [];
  }

  if (rankings.length === 0) {
    showRankingMessage(rankingList, "아직 등록된 기록이 없습니다.");
    return rankings;
  }

  rankingList.replaceChildren();
  rankings.forEach((rank, index) => {
    const item = document.createElement("li");
    const rankIndex = document.createElement("span");
    const nickname = document.createElement("span");
    const time = document.createElement("span");

    rankIndex.className = "result-screen__rank-index";
    nickname.className = "result-screen__rank-name";
    time.className = "result-screen__rank-time";
    rankIndex.textContent = String(index + 1);
    nickname.textContent = rank.nickname;
    time.textContent = formatTime(rank.timeMs);

    item.append(rankIndex, nickname, time);
    rankingList.appendChild(item);
  });

  return rankings;
}

export function showEnding(endingId, data, { root, onRestart } = {}) {
  const ending = ENDINGS[endingId];
  if (!ending || !root) {
    throw new Error("엔딩 화면을 표시할 수 없습니다.");
  }

  const clearTimeMs = Math.max(0, Math.round(Number(data.clearTimeMs)) || 0);
  const node = document.createElement("div");
  node.className = `result-screen result-screen--${ending.type.toLowerCase()}`;
  node.innerHTML = `
    <p class="result-screen__type" data-role="ending-type"></p>
    <h2 class="result-screen__title" data-role="ending-title"></h2>
    <p class="result-screen__description" data-role="ending-description"></p>
    <dl class="result-screen__stats">
      <div><dt>클리어 시간</dt><dd data-role="clear-time"></dd></div>
      <div><dt>HP</dt><dd data-role="hp"></dd></div>
      <div><dt>Cringe</dt><dd data-role="cringe"></dd></div>
    </dl>
    <form class="result-screen__rank-form" data-role="rank-form" novalidate>
      <label class="sr-only" for="ending-rank-nickname">닉네임</label>
      <input id="ending-rank-nickname" type="text" name="nickname" class="result-screen__nickname" placeholder="닉네임" maxlength="12" autocomplete="nickname" required>
      <button type="submit" class="result-screen__submit">랭킹 등록</button>
    </form>
    <p class="result-screen__rank-status" data-role="rank-status" aria-live="polite" hidden></p>
    <div class="result-screen__player-rank" data-role="player-rank" aria-live="polite" hidden>
      <span>내 기록 <strong data-role="player-time"></strong></span>
      <span>현재 순위 <strong data-role="player-position"></strong></span>
    </div>
    <ol class="result-screen__ranking" data-role="ranking-list" aria-label="이 엔딩의 스피드런 랭킹"></ol>
    <button type="button" class="result-screen__restart" data-action="restart">처음으로</button>
  `;
  root.appendChild(node);

  node.querySelector("[data-role='ending-type']").textContent = `[${ending.type}]`;
  node.querySelector("[data-role='ending-title']").textContent = ending.title;
  node.querySelector("[data-role='ending-description']").textContent = ending.description;
  node.querySelector("[data-role='clear-time']").textContent = formatTime(clearTimeMs);
  node.querySelector("[data-role='hp']").textContent = `${data.hp} / ${data.hpMax}`;
  node.querySelector("[data-role='cringe']").textContent = `${data.cringe} / ${data.cringeMax}`;

  const rankingList = node.querySelector("[data-role='ranking-list']");
  const rankForm = node.querySelector("[data-role='rank-form']");
  const rankStatus = node.querySelector("[data-role='rank-status']");
  const playerRank = node.querySelector("[data-role='player-rank']");
  rankForm.elements.nickname.value = data.playerName ?? "";
  renderRanking(endingId, rankingList);

  function setStatus(message, isError = false) {
    rankStatus.hidden = false;
    rankStatus.textContent = message;
    rankStatus.classList.toggle("is-error", isError);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const input = rankForm.elements.nickname;
    const nickname = Array.from(input.value.trim()).slice(0, 12).join("");
    if (!nickname) {
      setStatus("닉네임을 입력해 주세요.", true);
      input.focus();
      return;
    }

    const submitButton = rankForm.querySelector(".result-screen__submit");
    submitButton.disabled = true;
    try {
      const result = await saveRanking(endingId, nickname, clearTimeMs);
      rankForm.reset();
      await renderRanking(endingId, rankingList);

      node.querySelector("[data-role='player-time']").textContent = formatTime(clearTimeMs);
      const rank = result.saved ? result.rank : null;
      node.querySelector("[data-role='player-position']").textContent = rank ? `${rank}위` : "랭킹 밖의 기록";
      playerRank.hidden = false;
      setStatus(result.saved ? "랭킹에 등록되었습니다!" : "10위 밖의 기록이라 저장되지 않았습니다.");
    } catch (error) {
      setStatus("랭킹을 저장하지 못했습니다. 다시 시도해 주세요.", true);
    } finally {
      submitButton.disabled = false;
    }
  }

  function handleClick(event) {
    if (event.target.closest("[data-action='restart']")) {
      onRestart?.();
    }
  }

  rankForm.addEventListener("submit", handleSubmit);
  node.addEventListener("click", handleClick);

  function destroy() {
    node.removeEventListener("click", handleClick);
    rankForm.removeEventListener("submit", handleSubmit);
    node.remove();
  }

  return { node, destroy };
}

export function createResultScreen({ root, ending, stats, clearTimeMs, playerName, onRestart }) {
  return showEnding(
    ending.id,
    {
      clearTimeMs,
      hp: stats.hp,
      hpMax: stats.hpMax,
      cringe: stats.cringe,
      cringeMax: stats.cringeMax,
      playerName,
    },
    { root, onRestart },
  );
}
