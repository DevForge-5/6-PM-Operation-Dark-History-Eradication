import { showEnding } from "../js/ui/result-screen.js";

const requestedEndingId = new URLSearchParams(location.search).get("ending");
const endingId = /^ending[1-5]$/.test(requestedEndingId) ? requestedEndingId : "ending1";
const samples = {
  ending1: { clearTimeMs: 1_025_000, hp: 100, hpMax: 100, cringe: 0, cringeMax: 100 },
  ending2: { clearTimeMs: 1_080_000, hp: 12, hpMax: 100, cringe: 100, cringeMax: 100 },
  ending3: { clearTimeMs: 872_000, hp: 0, hpMax: 100, cringe: 67, cringeMax: 100 },
  ending4: { clearTimeMs: 1_008_000, hp: 72, hpMax: 100, cringe: 85, cringeMax: 100 },
  ending5: { clearTimeMs: 492_000, hp: 53, hpMax: 100, cringe: 11, cringeMax: 100 },
};

showEnding(endingId, samples[endingId], {
  root: document.querySelector("#ending-test-root"),
  onRestart: () => {},
});
