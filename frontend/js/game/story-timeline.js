// Absolute in-game clock checkpoints. The clock snaps to these values right
// after each major story beat finishes, regardless of how many smaller
// minutesDelta ticks happened while playing through that beat.
export const STORY_TIME_CHECKPOINTS = Object.freeze({
  shadowDefeated: 17 * 60 + 5,
  officePassed: 17 * 60 + 10,
  sirenRound1Cleared: 17 * 60 + 15,
  sirenRound2Cleared: 17 * 60 + 20,
  sirenRound3Cleared: 17 * 60 + 25,
  timingPuzzleSolved: 17 * 60 + 35,
  mimicDefeated: 17 * 60 + 50,
  jumpMapSolved: 17 * 60 + 57,
});
