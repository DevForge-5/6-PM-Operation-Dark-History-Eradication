const rankings = [
  { nickname: "익명의생존자", clearTimeMinutes: 17 * 60 + 42, cringe: 12, endingType: "True" },
  { nickname: "쿨쌕남", clearTimeMinutes: 17 * 60 + 58, cringe: 30, endingType: "True" },
  { nickname: "흑염룡대재앙", clearTimeMinutes: 18 * 60, cringe: 88, endingType: "Bad" },
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sortRankings(list) {
  return [...list].sort((a, b) => a.clearTimeMinutes - b.clearTimeMinutes || a.cringe - b.cringe);
}

export async function fetchMockRanks() {
  await delay(150);
  return sortRankings(rankings);
}

export async function submitMockRank(entry) {
  await delay(150);
  rankings.push(entry);
  return entry;
}
