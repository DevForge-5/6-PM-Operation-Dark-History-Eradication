import { formatClock } from "../game/game-state.js";
import { fetchRanks, submitRank } from "../api/ranking-service.js";

export function createResultScreen({ root, ending, stats, onRestart }) {
  const node = document.createElement("div");
  node.className = "result-screen";
  node.innerHTML = `
    <p class="result-screen__type">[${ending.type}]</p>
    <h2 class="result-screen__title">${ending.title}</h2>
    <p class="result-screen__description">${ending.description}</p>
    <dl class="result-screen__stats">
      <div><dt>클리어 시각</dt><dd>${formatClock(stats)}</dd></div>
      <div><dt>HP</dt><dd>${stats.hp} / ${stats.hpMax}</dd></div>
      <div><dt>Cringe</dt><dd>${stats.cringe} / ${stats.cringeMax}</dd></div>
    </dl>
    <form class="result-screen__rank-form" data-role="rank-form">
      <input type="text" name="nickname" class="result-screen__nickname" placeholder="닉네임" maxlength="12" required>
      <button type="submit" class="result-screen__submit">랭킹 등록</button>
    </form>
    <p class="result-screen__rank-status" data-role="rank-status" hidden></p>
    <ol class="result-screen__ranking" data-role="ranking-list">
      <li class="result-screen__rank-loading">랭킹 불러오는 중...</li>
    </ol>
    <button type="button" class="result-screen__restart" data-action="restart">처음으로</button>
  `;
  root.appendChild(node);

  const rankingList = node.querySelector("[data-role='ranking-list']");
  const rankForm = node.querySelector("[data-role='rank-form']");
  const rankStatus = node.querySelector("[data-role='rank-status']");

  function renderRankings(ranks) {
    if (ranks.length === 0) {
      rankingList.innerHTML = "<li class=\"result-screen__rank-loading\">아직 등록된 기록이 없습니다.</li>";
      return;
    }

    rankingList.innerHTML = ranks
      .slice(0, 5)
      .map((rank, index) => `
        <li>
          <span class="result-screen__rank-index">${index + 1}</span>
          <span class="result-screen__rank-name">${rank.nickname}</span>
          <span class="result-screen__rank-time">${formatClock({ timeMinutes: rank.clearTimeMinutes })}</span>
        </li>
      `)
      .join("");
  }

  function showRankError() {
    rankingList.innerHTML = "<li class=\"result-screen__rank-loading\">랭킹을 불러오지 못했습니다.</li>";
  }

  fetchRanks().then(renderRankings).catch(showRankError);

  async function handleSubmit(event) {
    event.preventDefault();
    const nickname = new FormData(rankForm).get("nickname")?.toString().trim();
    if (!nickname) {
      return;
    }

    const submitButton = rankForm.querySelector("button");
    submitButton.disabled = true;

    try {
      await submitRank({
        nickname,
        clearTimeMinutes: stats.timeMinutes,
        cringe: stats.cringe,
        endingType: ending.type,
      });
      rankStatus.hidden = false;
      rankStatus.textContent = "랭킹에 등록되었습니다!";
      rankForm.hidden = true;
      renderRankings(await fetchRanks());
    } catch (error) {
      rankStatus.hidden = false;
      rankStatus.textContent = "등록에 실패했습니다. 다시 시도해 주세요.";
      submitButton.disabled = false;
    }
  }

  rankForm.addEventListener("submit", handleSubmit);

  function handleClick(event) {
    if (event.target.closest("[data-action='restart']")) {
      onRestart();
    }
  }
  node.addEventListener("click", handleClick);

  function destroy() {
    node.removeEventListener("click", handleClick);
    rankForm.removeEventListener("submit", handleSubmit);
    node.remove();
  }

  return { node, destroy };
}
