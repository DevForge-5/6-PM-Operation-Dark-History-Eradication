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
    tileSize: 64,
    minimumFloorGreen: 130,
    minimumFloorCoverage: 0.7,
  }),
  assets: Object.freeze({
    map: "./assets/images/MapGrid.png",
    collisionMap: "./assets/images/map-base.png",
    player: Object.freeze({
      down: "./assets/images/playerAction/Front.png",
      up: "./assets/images/playerAction/Back.png",
      left: "./assets/images/playerAction/Left.png",
      right: "./assets/images/playerAction/Right.png",
    }),
    monster: "./assets/images/shadow-monster.png",
  }),
  mapCrop: Object.freeze({
    x: 301,
    y: 529,
    width: 3520,
    height: 1216,
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
    animationFrameCount: 4,
    animationFrameDuration: 0.14,
  }),
  // NOTE: the current prototype map only has a walkable
  // corridor up to ~x2300 (there's a solid pillar right after that), so a
  // second physical encounter doesn't fit here yet. musicRoomSiren's event
  // data still exists in data/events.js for when a room extension is added.
  encounters: Object.freeze([
    Object.freeze({
      id: "hallwayShadow",
      eventId: "hallwayShadow",
      x: 2176,
      y: 128,
      size: 128,
      collisionInsetX: 24,
      collisionTop: 24,
      collisionBottom: 10,
    }),
  ]),
  goal: Object.freeze({
    x: 2230,
    y: 195,
    size: 60,
  }),
  pickups: Object.freeze([
    Object.freeze({
      id: "earbudsPickup",
      itemId: "noiseCancelingEarbuds",
      x: 1820,
      y: 180,
      size: 56,
    }),
  ]),
  stats: Object.freeze({
    startMinutes: 17 * 60,
    limitMinutes: 18 * 60,
    hpMax: 100,
    cringeMax: 100,
  }),
});
