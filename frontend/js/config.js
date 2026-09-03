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
  camera: Object.freeze({
    zoom: 2.5,
  }),
  rooms: Object.freeze([
    Object.freeze({ id: "serverRoom", x: 64, y: 384, width: 896, height: 768, margin: 128, framePadding: 128 }),
    Object.freeze({
      id: "eastHall",
      x: 2560,
      y: 704,
      width: 896,
      height: 448,
      disableFog: true,
      marginTop: 64,
      framePadding: 128,
    }),
    Object.freeze({
      id: "stairsRoom",
      x: 2368,
      y: 128,
      width: 512,
      height: 448,
      framePadding: 128,
    }),
  ]),
  collision: Object.freeze({
    tileSize: 64,
    walkableTiles: Object.freeze([
      ".......................................................",
      ".......................####............................",
      ".......................#############.###########.......",
      ".......................#############.###########.......",
      ".......................####.......##.########.##.......",
      "..................................##.########.##.......",
      ".##############...................##.########.##.......",
      ".##############...................###########.##.......",
      ".##############...................###########.##.......",
      ".##############...............................##.......",
      ".##############.........................##############.",
      ".##############..........#####..........##############.",
      ".##############...####...#####...####...##############.",
      ".#####################################################.",
      ".#####################################################.",
      ".##############...####...#####...####...##############.",
      ".##############..........#####..........##############.",
      ".##############.........................##############.",
      ".......................................................",
    ]),
  }),
  assets: Object.freeze({
    map: "./assets/images/MapGrid.png",
    player: Object.freeze({
      down: "./assets/images/playerAction/Front.png",
      up: "./assets/images/playerAction/Back.png",
      left: "./assets/images/playerAction/Left.png",
      right: "./assets/images/playerAction/Right.png",
    }),
    monster: "./assets/images/shadowMonsterAction/shadow-monster.png",
    monsterDefeat: "./assets/images/shadowMonsterAction/그림자-괴물_죽음 1.png",
    mimic: "./assets/images/미믹 1.png",
    barrier: "./assets/images/방벽 1.png",
    computer: "./assets/images/컴퓨터 1.png",
    earbuds: "./assets/images/에어팟 1.png",
    office: Object.freeze({
      principalIdle: "./assets/images/교장Assets/교장_눈치 못챔 2.png",
      principalSuspicious: "./assets/images/교장Assets/교장_확인함 1.png",
      principalAlert: "./assets/images/교장Assets/교장_확인함 2.png",
      sofa: "./assets/images/교장Assets/쇼파 1.png",
      vases: Object.freeze([
        "./assets/images/교장Assets/꽃병 1.png",
        "./assets/images/교장Assets/꽃병 2.png",
        "./assets/images/교장Assets/꽃병 3.png",
        "./assets/images/교장Assets/꽃병 4.png",
      ]),
    }),
    musicRoom: Object.freeze({
      // Each 피아노 N.png is pre-rotated so its keyboard opens toward the
      // room's center from its own corner (tail tucked into the corner).
      pianoTopLeft: "./assets/images/MusicRooms/피아노 1.png",
      pianoTopRight: "./assets/images/MusicRooms/피아노 2.png",
      pianoBottomLeft: "./assets/images/MusicRooms/피아노 4.png",
      pianoBottomRight: "./assets/images/MusicRooms/피아노 3.png",
      siren: "./assets/images/세이렌 1.png",
    }),
  }),
  monsterDefeat: Object.freeze({
    frameCount: 4,
    frameDuration: 0.14,
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
  encounters: Object.freeze([
    Object.freeze({
      id: "hallwayShadow",
      eventId: "hallwayShadow",
      x: 2176,
      y: 128,
      size: 128,
      collisionInsetX: 0,
      collisionTop: 0,
      collisionBottom: 0,
    }),
  ]),
  mimic: Object.freeze({
    x: 1664,
    y: 768,
    size: 192,
  }),
  barrier: Object.freeze({
    x: 2176,
    y: 768,
    width: 64,
    height: 256,
  }),
  computer: Object.freeze({
    x: 2304,
    y: 768,
    size: 64,
  }),
  goal: Object.freeze({
    x: 2240,
    y: 768,
    size: 60,
  }),
  pickups: Object.freeze([
    Object.freeze({
      id: "earbudsPickup",
      itemId: "noiseCancelingEarbuds",
      x: 1824,
      y: 184,
      size: 48,
    }),
  ]),
  office: Object.freeze({
    bounds: Object.freeze({ x: 2304, y: 128, width: 512, height: 448 }),
    principal: Object.freeze({ x: 2496, y: 128, size: 128 }),
    sofa: Object.freeze({ x: 2432, y: 384, width: 256, height: 64 }),
    safeZone: Object.freeze({ x: 2432, y: 448, width: 256, height: 128 }),
    principalTiming: Object.freeze({ seatedSeconds: 3, suspiciousSeconds: 1, alertSeconds: 1 }),
    revealDuration: 0.65,
    // x values are content-anchored, not evenly stepped by `size` (64): each
    // 꽃병 N.png canvas is 64x64 but the vase artwork only fills ~26px of
    // that, off-center, with transparent padding around it. Spacing by the
    // full 64px canvas width left visible gaps between vases even though
    // their bounding boxes were touching. These x's instead line up the
    // actual painted pixels edge-to-edge (measured via each PNG's alpha
    // bounding box) so the row reads as one continuous shelf of vases.
    vases: Object.freeze([
      Object.freeze({ x: 2950, y: 64, size: 64 }),
      Object.freeze({ x: 2976, y: 64, size: 64 }),
      Object.freeze({ x: 3002, y: 64, size: 64 }),
      Object.freeze({ x: 3019, y: 64, size: 64 }),
    ]),
    alertDamagePerSecond: 80,
    vaseAttack: Object.freeze({
      // The trigger used to start at x2816, which overlaps the open office
      // floor (walkable [2176,2880] at this y) well before the stairwell
      // corridor - a wall separates them at x:2880-2944, and the corridor
      // itself is only the narrow walkable strip [2944,3072] (see
      // collision.walkableTiles rows at y=448/512). Player stepped into the
      // rectangle before ever entering the corridor, so the vases fell as a
      // "warning" instead of an actual obstacle blocking the passage.
      trigger: Object.freeze({ x: 2944, y: 448, width: 128, height: 128 }),
      sourceVaseIndexes: Object.freeze([1, 2]),
      fallSpeed: 720,
      shotDelay: 0.55,
      damage: 30,
      projectileSize: 40,
    }),
  }),
  musicRoom: Object.freeze({
    bounds: Object.freeze({ x: 2560, y: 704, width: 896, height: 448 }),
    pianoSize: 160,
    pianos: Object.freeze([
      Object.freeze({ corner: "pianoTopLeft", x: 2560, y: 680 }),
      Object.freeze({ corner: "pianoTopRight", x: 3296, y: 680 }),
      Object.freeze({ corner: "pianoBottomLeft", x: 2560, y: 992 }),
      Object.freeze({ corner: "pianoBottomRight", x: 3296, y: 992 }),
    ]),
    siren: Object.freeze({ x: 2953, y: 873, size: 110 }),
  }),
  stats: Object.freeze({
    startMinutes: 17 * 60,
    limitMinutes: 18 * 60,
    hpMax: 100,
    cringeMax: 100,
  }),
});
