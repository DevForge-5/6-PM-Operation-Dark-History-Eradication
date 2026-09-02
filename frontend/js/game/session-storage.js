const STORAGE_KEY = "sixpm:progress";

export function saveProgress(sceneName, payload, session) {
  try {
    const data = {
      scene: sceneName,
      payload: payload ?? null,
      stats: session.stats,
      clearedEvents: [...session.clearedEvents],
      inventory: [...session.inventory],
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Failed to save game progress", error);
  }
}

export function loadProgress() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Failed to load game progress", error);
    return null;
  }
}

export function clearProgress() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear game progress", error);
  }
}
