import { fetchMockRanks, submitMockRank } from "./mock-rankings.js";

// TODO(backend): flip to false once Spring Boot's POST /api/rank and
// GET /api/ranks are deployed, then drop mock-rankings.js.
const USE_MOCK = true;

export async function fetchRanks() {
  if (USE_MOCK) {
    return fetchMockRanks();
  }

  const response = await fetch("/api/ranks");
  if (!response.ok) {
    throw new Error(`랭킹을 불러오지 못했습니다 (${response.status})`);
  }
  return response.json();
}

export async function submitRank(entry) {
  if (USE_MOCK) {
    return submitMockRank(entry);
  }

  const response = await fetch("/api/rank", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!response.ok) {
    throw new Error(`랭킹 등록에 실패했습니다 (${response.status})`);
  }
  return response.json();
}
