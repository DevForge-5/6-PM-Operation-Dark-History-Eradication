export const GAME_CONFIG = Object.freeze({
  canvas: Object.freeze({
    width: 1024,
    height: 576,
  }),
  movementSpeed: 192,
  maxDeltaSeconds: 0.05,
  assets: Object.freeze({
    map: "./assets/images/map-base.png",
    player: "./assets/images/player-front.png",
    monster: "./assets/images/shadow-monster.png",
  }),
  mapCrop: Object.freeze({
    x: 1408,
    y: 0,
    width: 1024,
    height: 576,
  }),
  player: Object.freeze({
    x: 128,
    y: 192,
    size: 64,
    footInsetX: 14,
    footInsetY: 8,
    collisionInsetX: 16,
    collisionTop: 32,
    collisionBottom: 4,
  }),
  monster: Object.freeze({
    x: 768,
    y: 128,
    size: 128,
    collisionInsetX: 24,
    collisionTop: 24,
    collisionBottom: 10,
  }),
});
