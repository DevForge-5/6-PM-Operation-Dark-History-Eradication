let gameStartTime = null;
let pauseStartedTime = null;
let totalPausedTime = 0;

export function startGameTimer(now = performance.now()) {
  gameStartTime = now;
  pauseStartedTime = null;
  totalPausedTime = 0;
  return gameStartTime;
}

export function setGameTimerPaused(isPaused, now = performance.now()) {
  if (gameStartTime === null) {
    return;
  }

  if (isPaused && pauseStartedTime === null) {
    pauseStartedTime = now;
  } else if (!isPaused && pauseStartedTime !== null) {
    totalPausedTime += Math.max(0, now - pauseStartedTime);
    pauseStartedTime = null;
  }
}

export function stopGameTimer() {
  gameStartTime = null;
  pauseStartedTime = null;
  totalPausedTime = 0;
}

export function getClearTime(now = performance.now()) {
  if (gameStartTime === null) {
    return 0;
  }

  const effectiveNow = pauseStartedTime ?? now;
  return Math.max(0, Math.round(effectiveNow - gameStartTime - totalPausedTime));
}

export function formatTime(timeMs) {
  const totalSeconds = Math.max(0, Math.floor(Number(timeMs) / 1000) || 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
