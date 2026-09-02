export const RANKING_STORAGE_KEY = "webgame_speedrun_rankings";
export const ENDING_IDS = Object.freeze(["ending1", "ending2", "ending3", "ending4", "ending5"]);
const MAX_RANKINGS = 10;

function createEmptyRankings() {
  return Object.fromEntries(ENDING_IDS.map((endingId) => [endingId, []]));
}

function normalizeEntry(entry) {
  if (!entry || typeof entry.nickname !== "string" || !Number.isFinite(entry.timeMs)) {
    return null;
  }

  const nickname = Array.from(entry.nickname.trim()).slice(0, 12).join("");
  if (!nickname) {
    return null;
  }

  return { nickname, timeMs: Math.max(0, Math.round(entry.timeMs)) };
}

function loadRankings() {
  const empty = createEmptyRankings();

  try {
    const stored = JSON.parse(localStorage.getItem(RANKING_STORAGE_KEY));
    if (!stored || typeof stored !== "object") {
      return empty;
    }

    for (const endingId of ENDING_IDS) {
      const entries = Array.isArray(stored[endingId]) ? stored[endingId] : [];
      empty[endingId] = entries
        .map(normalizeEntry)
        .filter(Boolean)
        .sort((a, b) => a.timeMs - b.timeMs)
        .slice(0, MAX_RANKINGS);
    }
  } catch (error) {
    console.warn("저장된 스피드런 랭킹을 읽지 못했습니다.", error);
  }

  return empty;
}

export function getRanking(endingId) {
  if (!ENDING_IDS.includes(endingId)) {
    return [];
  }

  return loadRankings()[endingId].map((entry) => ({ ...entry }));
}

export function saveRanking(endingId, nickname, timeMs) {
  if (!ENDING_IDS.includes(endingId)) {
    throw new Error("알 수 없는 엔딩입니다.");
  }

  const entry = normalizeEntry({ nickname, timeMs });
  if (!entry) {
    throw new Error("닉네임과 기록을 확인해 주세요.");
  }

  const rankings = loadRankings();
  const candidate = [...rankings[endingId], entry].sort((a, b) => a.timeMs - b.timeMs);
  const playerRank = candidate.indexOf(entry) + 1;
  const saved = playerRank <= MAX_RANKINGS;

  if (saved) {
    rankings[endingId] = candidate.slice(0, MAX_RANKINGS);
    localStorage.setItem(RANKING_STORAGE_KEY, JSON.stringify(rankings));
  }

  return { saved, rank: saved ? playerRank : null, entry };
}

export function getPlayerRank(endingId, timeMs) {
  const normalizedTime = Math.max(0, Math.round(Number(timeMs)));
  const index = getRanking(endingId).findIndex((entry) => entry.timeMs === normalizedTime);
  return index === -1 ? null : index + 1;
}
