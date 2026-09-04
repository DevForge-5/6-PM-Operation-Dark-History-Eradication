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
    introZoom: 3.25,
    introRevealSeconds: 1.8,
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
    // Second minigame gate, on the corridor between the server room and the
    // mimic - distinct art from the office/computer barrier pair above.
    mimicRoomBarrier: "./assets/images/2차미니게임기둥벽.png",
    mimicRoomComputer: "./assets/images/2차미니게임컴퓨터.png",
    // Placeholder idle sprite for the server-room final boss (흑화 최지훈) -
    // a 4-frame sheet, only frame 0 is drawn until the real fight is built.
    finalBoss: "./assets/images/bossAction/최종보스 1.png",
    finalBossMagic: "./assets/images/bossAction/최종보스_마법 1.png",
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
      pianoAttack: "./assets/images/MusicRooms/피아노_입벌림 1.png",
      siren: "./assets/images/세이렌 1.png",
      sirenAttack: "./assets/images/세이렌_공격 1.png",
      beam: "./assets/images/MusicRooms/장풍 1.png",
    }),
    mimicBattle: Object.freeze({
      background: "./assets/images/미믹_포켓몬배틀/배틀_배경.png",
      mimicIdle: "./assets/images/미믹 1.png",
      // Both spritesheets lay 4 frames out horizontally; only the last
      // (fully-open mouth / fully-collapsed rubble) frame is used here.
      mimicAttack: "./assets/images/미믹_입벌리기 1.png",
      mimicDefeat: "./assets/images/미믹_죽음 1.png",
    }),
  }),
  monsterDefeat: Object.freeze({
    frameCount: 4,
    frameDuration: 0.28,
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
    Object.freeze({
      id: "mimicBox",
      eventId: "mimicBattle",
      x: 1664,
      y: 768,
      size: 192,
      collisionInsetX: 0,
      collisionTop: 0,
      collisionBottom: 0,
      // Drawn by the dedicated `mimic` sprite block in render() instead of
      // the generic encounter loop, which always draws `images.monster`.
      skipDefaultRender: true,
    }),
  ]),
  mimic: Object.freeze({
    x: 1664,
    y: 768,
    size: 192,
  }),
  mimicBattle: Object.freeze({
    mimicMaxHp: 100,
    playerAttackDamage: 25,
    mimicAttackDamage: 5,
    warmupEvasionBonus: 20,
    rewardItemId: "magicWand",
    mouthOpenFrameCount: 4,
    deathFrameCount: 4,
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
  // Second minigame's own small room, between the server room and the
  // mimic corridor. Its map art is the same room shape as the office
  // barrier+computer room, shifted exactly 960px to the left (measured by
  // matching the two rooms' corner-tile art pixel-for-pixel), so these
  // mirror `barrier`/`computer` above at that same offset.
  mimicRoomBarrier: Object.freeze({
    x: 1216,
    y: 768,
    width: 64,
    height: 256,
  }),
  mimicRoomComputer: Object.freeze({
    x: 1344,
    y: 768,
    size: 64,
  }),
  // Placeholder trigger: touching him ends the run in victory until the
  // real boss fight replaces this. Sprite sheet is 4 frames, 128px each.
  finalBoss: Object.freeze({
    x: 448,
    y: 800,
    size: 128,
    frameSize: 128,
    triggerPadding: 64,
  }),
  finalBossBattle: Object.freeze({
    phaseHpThresholds: Object.freeze([75, 50, 25, 0]),
    playerInvulnerabilitySeconds: 1.1,
    weakPointSeconds: 2.5,
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
    bounds: Object.freeze({ x: 2304, y: 128, width: 576, height: 448 }),
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
      // The stairwell's stone-step art ends and the music room's wood floor
      // begins at y:640 (matches musicRoom.fight.arena.y) - despawn the vase
      // there instead of letting it fall to the bottom of the whole world,
      // which used to carry it straight through into the music room.
      despawnY: 640,
    }),
  }),
  musicRoom: Object.freeze({
    bounds: Object.freeze({ x: 2560, y: 704, width: 896, height: 448 }),
    pianoSize: 160,
    pianos: Object.freeze([
      Object.freeze({ corner: "pianoTopLeft", x: 2560, y: 632 }),
      Object.freeze({ corner: "pianoTopRight", x: 3296, y: 632 }),
      Object.freeze({ corner: "pianoBottomLeft", x: 2560, y: 992 }),
      Object.freeze({ corner: "pianoBottomRight", x: 3296, y: 992 }),
    ]),
    siren: Object.freeze({ x: 2953, y: 873, size: 110 }),
    // Ambient energy trail flowing from each piano toward the siren at the
    // room's center. Unlike every other entity above, these x/y are CENTER
    // points (the render loop subtracts beamFrameSize/2), because each dot
    // is just a midpoint sample along a piano->siren line, not a placed
    // object with its own top-left origin. frame 0->3 = small spark -> big
    // comet (see 장풍 1.png), ordered piano-side -> siren-side so the trail
    // reads as energy growing as it converges on the siren.
    beamFrameSize: 64,
    beamTrails: Object.freeze([
      // pianoTopLeft -> siren
      Object.freeze({ frame: 0, x: 2743, y: 772 }),
      Object.freeze({ frame: 1, x: 2817, y: 816 }),
      Object.freeze({ frame: 2, x: 2890, y: 859 }),
      Object.freeze({ frame: 3, x: 2964, y: 902 }),
      // pianoTopRight -> siren
      Object.freeze({ frame: 0, x: 3273, y: 772 }),
      Object.freeze({ frame: 1, x: 3199, y: 816 }),
      Object.freeze({ frame: 2, x: 3126, y: 859 }),
      Object.freeze({ frame: 3, x: 3052, y: 902 }),
      // pianoBottomLeft -> siren
      Object.freeze({ frame: 0, x: 2743, y: 1032 }),
      Object.freeze({ frame: 1, x: 2817, y: 1003 }),
      Object.freeze({ frame: 2, x: 2890, y: 974 }),
      Object.freeze({ frame: 3, x: 2964, y: 945 }),
      // pianoBottomRight -> siren
      Object.freeze({ frame: 0, x: 3273, y: 1032 }),
      Object.freeze({ frame: 1, x: 3199, y: 1003 }),
      Object.freeze({ frame: 2, x: 3126, y: 974 }),
      Object.freeze({ frame: 3, x: 3052, y: 945 }),
    ]),
    // In-world siren boss fight. The fight runs inside the exploration scene
    // on the real music-room floor (no popup arena): the 4 pianos fire energy
    // bolts at the player, and between rounds the siren drops its guard so the
    // player can run into it to counterattack.
    fight: Object.freeze({
      // Entering this rect starts the fight, and the player is sealed inside
      // it until the fight resolves. It covers the room's whole walkable
      // floor, which starts one tile row above `bounds` (see walkableTiles).
      arena: Object.freeze({ x: 2560, y: 640, width: 896, height: 512 }),
      sirenHp: 3,
      hitDamage: 6,
      projectileSize: 56,
      // The drawn 장풍 sprite has transparent padding and a long tail; the
      // hitbox is the bright head only, so grazes don't read as unfair hits.
      projectileHitSize: 30,
      stunSeconds: 3,
      // How long a piano holds its open-mouth pose after firing a bolt.
      pianoAttackPoseSeconds: 0.45,
      hitPauseSeconds: 0.5,
      counterFlashSeconds: 0.35,
      rounds: Object.freeze([
        Object.freeze({ durationSeconds: 4, spawnIntervalSeconds: 0.75, projectileSpeed: 200, pattern: "single" }),
        Object.freeze({ durationSeconds: 4, spawnIntervalSeconds: 0.65, projectileSpeed: 220, pattern: "single", dialogueId: "taunt1" }),
        Object.freeze({ durationSeconds: 4.5, spawnIntervalSeconds: 0.55, projectileSpeed: 240, pattern: "pair" }),
        Object.freeze({ durationSeconds: 4.5, spawnIntervalSeconds: 0.5, projectileSpeed: 260, pattern: "pair", dialogueId: "taunt2" }),
        Object.freeze({ durationSeconds: 5, spawnIntervalSeconds: 0.42, projectileSpeed: 290, pattern: "all" }),
        Object.freeze({ durationSeconds: 5, spawnIntervalSeconds: 0.35, projectileSpeed: 320, pattern: "all" }),
      ]),
      // The fight warps the player here as it starts, so it always opens with
      // both fighters staged in the middle of the floor - whichever door they
      // walked in through, they never start the fight stuck in a doorway.
      playerStart: Object.freeze({ x: 2976, y: 1020, facing: "up" }),
      // Where the player is pushed back to after losing, so re-entering the
      // room restarts the fight (corridor tile just west of the room).
      retreat: Object.freeze({ x: 2464, y: 864 }),
    }),
  }),
  stats: Object.freeze({
    startMinutes: 17 * 60,
    limitMinutes: 18 * 60,
    hpMax: 100,
    cringeMax: 100,
  }),
});
