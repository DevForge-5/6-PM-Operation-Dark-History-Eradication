export function canTriggerEnding(session) {
  return session?.bossBattleCompleted === true && session?.bossStoryCompleted === true;
}
