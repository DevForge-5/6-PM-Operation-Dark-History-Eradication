export const GAME_CONFIG = Object.freeze({
  canvas: Object.freeze({
    width: 1024,
    height: 576,
  }),
  world: Object.freeze({
    width: 3520,
    height: 1216,
  }),
  movementSpeed: 192,
  maxDeltaSeconds: 0.05,
  collision: Object.freeze({
    minimumGreen: 80,
  }),
  assets: Object.freeze({
    map: "./assets/images/map-base.png",
    player: Object.freeze({
      down: "./assets/images/player-front.png",
      up: "./assets/images/player-back.png",
      left: "./assets/images/player-left.png",
      right: "./assets/images/player-right.png",
    }),
    monster: "./assets/images/shadow-monster.png",
  }),
  player: Object.freeze({
    x: 1536,
    y: 192,
    size: 64,
    footInsetX: 14,
    footInsetY: 8,
    collisionInsetX: 16,
    collisionTop: 32,
    collisionBottom: 4,
  }),
  monster: Object.freeze({
    enabled: true,
    x: 2176,
    y: 128,
    size: 128,
    collisionInsetX: 24,
    collisionTop: 24,
    collisionBottom: 10,
  }),
  stats: Object.freeze({
    startMinutes: 17 * 60,
    limitMinutes: 18 * 60,
    hpMax: 100,
    cringeMax: 100,
  }),
});
