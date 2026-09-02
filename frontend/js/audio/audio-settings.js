export const AUDIO_SETTINGS_STORAGE_KEY = "webgame_audio_settings";
const AUDIO_TYPES = Object.freeze(["sfx", "bgm"]);
const DEFAULT_SETTINGS = Object.freeze({ sfx: 100, bgm: 100 });
const audioRegistry = {
  sfx: new Set(),
  bgm: new Set(),
};

function clampVolume(value) {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
}

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY));
    return {
      sfx: clampVolume(stored?.sfx ?? DEFAULT_SETTINGS.sfx),
      bgm: clampVolume(stored?.bgm ?? DEFAULT_SETTINGS.bgm),
    };
  } catch (error) {
    console.warn("오디오 설정을 읽지 못했습니다.", error);
    return { ...DEFAULT_SETTINGS };
  }
}

let settings = loadSettings();

function applyVolume(type) {
  for (const audio of audioRegistry[type]) {
    audio.volume = settings[type] / 100;
  }
}

function saveSettings() {
  localStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function getAudioSettings() {
  return { ...settings };
}

export function setAudioVolume(type, value) {
  if (!AUDIO_TYPES.includes(type)) {
    throw new Error("알 수 없는 오디오 종류입니다.");
  }

  settings = { ...settings, [type]: clampVolume(value) };
  saveSettings();
  applyVolume(type);
  return settings[type];
}

export function setSfxVolume(value) {
  return setAudioVolume("sfx", value);
}

export function setBgmVolume(value) {
  return setAudioVolume("bgm", value);
}

export function registerAudio(type, audio) {
  if (!AUDIO_TYPES.includes(type) || !audio || typeof audio !== "object" || !("volume" in audio)) {
    throw new Error("등록할 오디오 객체를 확인해 주세요.");
  }

  audioRegistry[type].add(audio);
  audio.volume = settings[type] / 100;
  return () => audioRegistry[type].delete(audio);
}
