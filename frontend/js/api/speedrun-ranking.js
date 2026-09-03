export const ENDING_IDS = Object.freeze(["ending1", "ending2", "ending3", "ending4", "ending5"]);

// Same-origin by default (works once frontend+backend share a domain, e.g.
// behind a reverse proxy in deployment). For local dev where the frontend is
// served separately from the Spring Boot app, set
// `window.SIXPM_API_BASE_URL = "http://localhost:8080"` before this module
// loads (see frontend/index.html).
const API_BASE_URL = globalThis.SIXPM_API_BASE_URL ?? "";

function normalizeEntry(raw) {
  if (!raw || typeof raw.nickname !== "string" || !Number.isFinite(raw.clearTimeMs)) {
    return null;
  }

  return { nickname: raw.nickname, timeMs: raw.clearTimeMs };
}

export async function getRanking(endingId) {
  if (!ENDING_IDS.includes(endingId)) {
    return [];
  }

  const response = await fetch(`${API_BASE_URL}/api/rankings/${endingId}`);
  if (!response.ok) {
    throw new Error(`랭킹을 불러오지 못했습니다 (${response.status})`);
  }

  const data = await response.json();
  return data.map(normalizeEntry).filter(Boolean);
}

export async function saveRanking(endingId, nickname, timeMs) {
  if (!ENDING_IDS.includes(endingId)) {
    throw new Error("알 수 없는 엔딩입니다.");
  }

  const trimmedNickname = Array.from(nickname.trim()).slice(0, 12).join("");
  if (!trimmedNickname) {
    throw new Error("닉네임과 기록을 확인해 주세요.");
  }

  const response = await fetch(`${API_BASE_URL}/api/rankings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nickname: trimmedNickname,
      endingId,
      clearTimeMs: Math.max(0, Math.round(Number(timeMs)) || 0),
    }),
  });

  if (!response.ok) {
    throw new Error(`랭킹 등록에 실패했습니다 (${response.status})`);
  }

  const result = await response.json();
  return {
    saved: result.saved,
    rank: result.rank,
    entry: { nickname: result.nickname, timeMs: result.clearTimeMs },
  };
}
