import { fetchMockRanks, submitMockRank } from "./mock-rankings.js";

// TODO(backend): flip to false once the team is ready to develop against a
// locally-running backend (or it's deployed) — real API wiring already
// verified end to end, see docs/api-contract.md. Mock keeps frontend work
// unblocked for anyone not running the Spring Boot app locally.
const USE_MOCK = true;

// Same-origin by default (works once frontend+backend share a domain, e.g.
// behind a reverse proxy in deployment). For local dev where the frontend is
// served separately from the Spring Boot app, set
// `window.SIXPM_API_BASE_URL = "http://localhost:8080"` before this module
// loads (see frontend/tests or a local-only <script> — never commit a
// hardcoded localhost default here).
const API_BASE_URL = globalThis.SIXPM_API_BASE_URL ?? "";

export async function fetchRanks() {
  if (USE_MOCK) {
    return fetchMockRanks();
  }

  const response = await fetch(`${API_BASE_URL}/api/ranks`);
  if (!response.ok) {
    throw new Error(`랭킹을 불러오지 못했습니다 (${response.status})`);
  }
  return response.json();
}

export async function submitRank(entry) {
  if (USE_MOCK) {
    return submitMockRank(entry);
  }

  const response = await fetch(`${API_BASE_URL}/api/rank`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!response.ok) {
    throw new Error(`랭킹 등록에 실패했습니다 (${response.status})`);
  }
  return response.json();
}
