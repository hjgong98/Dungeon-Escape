class Dungeons extends Phaser.Scene {
  constructor() {
    super('Dungeons');

    this.player = null;
    this.playerSpeed = 0.75;
    this.playerSpriteKey = 'player';
    this.playerIdleSpriteKey = 'player-idle';
    this.playerAttackSpriteKey = 'player-attack';
    this.playerWalkAnimKey = 'player-walk';
    this.playerIdleAnimKey = 'player-idle';
    this.playerAttackAnimKey = 'player-attack';
    this.activePlayerSpriteOption = null;
    this.playerFacing = 'right';
    this.playerIdleCropTop = 2;
    this.playerAttackLockUntil = 0;
    this.enemySpriteKey = 'enemy';
    this.enemyHurtSpriteKey = 'enemy-hurt';
    this.enemyWalkAnimKeys = {
      down: 'enemy-walk-down',
      up: 'enemy-walk-up',
      left: 'enemy-walk-left',
      right: 'enemy-walk-right',
    };
    this.enemyHurtAnimKeys = {
      down: 'enemy-hurt-down',
      up: 'enemy-hurt-up',
      left: 'enemy-hurt-left',
      right: 'enemy-hurt-right',
    };
    this.enemyDisplaySize = 30;
    this.lootboxSpriteKey = 'lootbox';
    this.lootboxOpenAnimKey = 'lootbox-open';
    this.keys = {};

    this.dungeon = null;
    this.currentFloor = 0;
    this.currentFloorData = null;
    this.tileSize = 20;
    this.worldOffset = { x: 0, y: 0 };
    this.floorBounds = { minX: 0, minY: 0, width: 800, height: 600 };

    this.graphics = null;
    this.stairPrompt = null;
    this.exitPrompt = null;
    this.entrancePrompt = null;
    this.floorText = null;
    this.currentRoomText = null;
    this.decorTexts = [];

    this.walkableTiles = new Set();
    this.corridorWallEdges = new Set();
    this.roomOpenEdges = new Map();
    this.currentRoom = null;
    this.activatedRooms = new Set();
    this.enemies = [];
    this.monsterController = null;
    this.lootboxes = [];
    this.nearLootbox = null;
    this.lootboxPrompt = null;
    this.enemyWanderSpeed = 0.25;
    this.enemyChaseSpeed = 0.5;
    this.enemyDetectionRange = 140;

    this.exploredOverlay = null;
    this.lanternGlow = null;
    this.lanternMaskKey = 'lantern-mask';
    this.exploredMaskKey = 'explored-mask';
    this.lanternRadius = 40;
    this.lanternSoftness = 20;
    this.darknessColor = 0x000000;
    this.exploredDarknessAlpha = 0.82;
    this.lanternOffsetX = 0;
    this.lanternOffsetY = 0;
    this.lanternMaskSize = 0;

    this.nearStair = null;
    this.nearExit = false;
    this.nearEntrance = false;
    this.lastStairDir = null;
    this.interactionRadius = 10;
    this.monstersAlerted = false;
    this.wallLineThickness = 2;
    this.corridorWallLineThickness = 2;
    this.floorTileColor = 0x444444;
    this.solidTileColor = 0x222222;
    this.wallLineColor = 0x111111;
    this.openEdgeLineColor = this.floorTileColor;
    this.playerCollisionRadius = 6;
    this.monsterCollisionRadius = 4;
    this.playerCollisionOffsetY = 4;
    this.monsterCollisionOffsetY = 5;
    this.monsterHitPushback = 12;
    this.playerMonsterContactCooldown = 280;
    this.discardUIActive = false;
    this.discardUIPending = [];
    this.discardUIElements = [];
    this.isPlayerDefeated = false;
  }

  preload() {
    this.configurePlayerSpriteOption();

    if (!this.textures.exists(this.playerSpriteKey)) {
      this.load.spritesheet(
        this.playerSpriteKey,
        this.activePlayerSpriteOption.walkPath,
        {
          frameWidth: this.activePlayerSpriteOption.frameWidth,
          frameHeight: this.activePlayerSpriteOption.frameHeight,
        },
      );
    }

    if (!this.textures.exists(this.playerIdleSpriteKey)) {
      this.load.spritesheet(
        this.playerIdleSpriteKey,
        this.activePlayerSpriteOption.idlePath,
        {
          frameWidth: this.activePlayerSpriteOption.frameWidth,
          frameHeight: this.activePlayerSpriteOption.frameHeight,
        },
      );
    }

    if (!this.textures.exists(this.playerAttackSpriteKey)) {
      this.load.spritesheet(
        this.playerAttackSpriteKey,
        this.activePlayerSpriteOption.attackPath,
        {
          frameWidth: this.activePlayerSpriteOption.frameWidth,
          frameHeight: this.activePlayerSpriteOption.frameHeight,
        },
      );
    }

    if (!this.textures.exists(this.enemySpriteKey)) {
      this.load.spritesheet(
        this.enemySpriteKey,
        './assets/player/Slime1_Walk_with_shadow.png',
        {
          frameWidth: 64,
          frameHeight: 64,
        },
      );
    }

    if (!this.textures.exists(this.enemyHurtSpriteKey)) {
      this.load.spritesheet(
        this.enemyHurtSpriteKey,
        './assets/player/Slime1_Hurt_with_shadow.png',
        {
          frameWidth: 64,
          frameHeight: 64,
        },
      );
    }

    if (!this.textures.exists(this.lootboxSpriteKey)) {
      this.load.spritesheet(
        this.lootboxSpriteKey,
        './assets/player/RPG Chests.png',
        {
          frameWidth: 32,
          frameHeight: 32,
        },
      );
    }
  }

  create() {
    this.configurePlayerSpriteOption();
    this.isPlayerDefeated = false;
    this.resetForFreshDungeonRun();
    this.ensureLanternMaskTexture();
    this.ensurePlayerAnimation();
    this.ensureEnemyAnimation();
    this.ensureLootboxAnimation();

    this.monsterController = new DungeonMonsterController(this, {
      wanderSpeed: this.enemyWanderSpeed,
      chaseSpeed: this.enemyChaseSpeed,
      globalAggro: this.monstersAlerted,
    });

    this.dungeon = generateDungeon();

    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      q: Phaser.Input.Keyboard.KeyCodes.Q,
      r: Phaser.Input.Keyboard.KeyCodes.R,
    });

    this.loadFloor(0);

    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(4);
  }

  ensurePlayerAnimation() {
    if (!this.anims.exists(this.playerWalkAnimKey)) {
      this.anims.create({
        key: this.playerWalkAnimKey,
        frames: this.anims.generateFrameNumbers(this.playerSpriteKey, {
          start: 0,
          end: Math.max(0, this.activePlayerSpriteOption.walkFrameCount - 1),
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    if (!this.anims.exists(this.playerIdleAnimKey)) {
      this.anims.create({
        key: this.playerIdleAnimKey,
        frames: this.anims.generateFrameNumbers(this.playerIdleSpriteKey, {
          start: 0,
          end: Math.max(0, this.activePlayerSpriteOption.idleFrameCount - 1),
        }),
        frameRate: 6,
        repeat: -1,
      });
    }

    if (!this.anims.exists(this.playerAttackAnimKey)) {
      this.anims.create({
        key: this.playerAttackAnimKey,
        frames: this.anims.generateFrameNumbers(this.playerAttackSpriteKey, {
          start: 0,
          end: Math.max(0, this.activePlayerSpriteOption.attackFrameCount - 1),
        }),
        frameRate: 14,
        repeat: 0,
      });
    }
  }

  configurePlayerSpriteOption() {
    const selectedId = globalThis.gameState?.player?.selectedSpriteId;
    const fallbackOption = {
      id: 'owlet',
      walkPath: './assets/player/Owlet_Monster_Walk_6.png',
      idlePath: './assets/player/Owlet_Monster_Idle_4.png',
      attackPath: './assets/player/Owlet_Monster_Attack1_4.png',
      frameWidth: 32,
      frameHeight: 32,
      walkFrameCount: 6,
      idleFrameCount: 4,
      attackFrameCount: 4,
    };
    this.activePlayerSpriteOption =
      globalThis.getPlayerSpriteOption?.(selectedId) || fallbackOption;
    this.playerSpriteKey = `player-${this.activePlayerSpriteOption.id}-walk`;
    this.playerIdleSpriteKey =
      `player-${this.activePlayerSpriteOption.id}-idle`;
    this.playerAttackSpriteKey =
      `player-${this.activePlayerSpriteOption.id}-attack`;
    this.playerWalkAnimKey =
      `player-${this.activePlayerSpriteOption.id}-walk-anim`;
    this.playerIdleAnimKey =
      `player-${this.activePlayerSpriteOption.id}-idle-anim`;
    this.playerAttackAnimKey =
      `player-${this.activePlayerSpriteOption.id}-attack-anim`;
  }

  ensureEnemyAnimation() {
    const rows = {
      down: 0,
      up: 1,
      left: 2,
      right: 3,
    };

    Object.entries(this.enemyWalkAnimKeys).forEach(([direction, key]) => {
      if (this.anims.exists(key)) {
        return;
      }

      const row = rows[direction];
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(this.enemySpriteKey, {
          start: row * 8,
          end: row * 8 + 7,
        }),
        frameRate: 12,
        repeat: -1,
      });
    });

    Object.entries(this.enemyHurtAnimKeys).forEach(([direction, key]) => {
      if (this.anims.exists(key)) {
        return;
      }

      const row = rows[direction];
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(this.enemyHurtSpriteKey, {
          start: row * 5,
          end: row * 5 + 4,
        }),
        frameRate: 14,
        repeat: 0,
      });
    });
  }

  ensureLootboxAnimation() {
    if (this.anims.exists(this.lootboxOpenAnimKey)) {
      return;
    }

    this.anims.create({
      key: this.lootboxOpenAnimKey,
      frames: [2, 11, 20, 29].map((frame) => ({
        key: this.lootboxSpriteKey,
        frame,
      })),
      frameRate: 10,
      repeat: 0,
    });
  }

  loadFloor(floorNum) {
    this.currentFloor = floorNum;
    const floor = this.dungeon.floors[floorNum];
    this.currentFloorData = floor;
    this.nearStair = null;
    this.nearExit = false;
    this.nearEntrance = false;

    if (this.stairPrompt) {
      this.stairPrompt.destroy();
      this.stairPrompt = null;
    }
    if (this.exitPrompt) {
      this.exitPrompt.destroy();
      this.exitPrompt = null;
    }
    if (this.entrancePrompt) {
      this.entrancePrompt.destroy();
      this.entrancePrompt = null;
    }

    if (this.graphics) {
      this.graphics.destroy();
    }
    this.graphics = this.add.graphics();
    this.graphics.setDepth(0);

    this.destroyDecorTexts();
    this.destroyEnemies();
    this.destroyLootboxes();

    this.calculateBounds(floor);
    this.drawFloor(floor);
    this.buildWalkableTiles(floor);
    this.buildCorridorWallEdges(floor);

    this.roomOpenEdges.clear();
    floor.rooms.forEach((room) => {
      this.roomOpenEdges.set(room.id, new Set(room.openEdges || []));
    });

    this.createEnemiesForFloor(floor);
    this.createLootboxesForFloor(floor);
    this.placePlayer(floor);

    this.cameras.main.setBounds(
      this.floorBounds.minX,
      this.floorBounds.minY,
      this.floorBounds.width,
      this.floorBounds.height,
    );

    this.createLanternOverlay();

    if (this.floorText) {
      this.floorText.destroy();
    }
    this.floorText = this.add.text(
      650,
      20,
      `Floor ${floorNum + 1}/${this.dungeon.totalFloors}`,
      { fontSize: '20px', fill: '#fff' },
    );
    this.floorText.setScrollFactor(0);
    this.floorText.setDepth(1100);

    if (this.currentRoomText) {
      this.currentRoomText.destroy();
    }
    this.currentRoomText = this.add.text(20, 20, 'Room: Corridor', {
      fontSize: '20px',
      fill: '#fff',
    });
    this.currentRoomText.setScrollFactor(0);
    this.currentRoomText.setDepth(1100);

    this.updateCurrentRoom(true);
    this.syncLantern();
  }

  calculateBounds(floor) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    floor.rooms.forEach((room) => {
      minX = Math.min(minX, room.x);
      minY = Math.min(minY, room.y);
      maxX = Math.max(maxX, room.x + room.w);
      maxY = Math.max(maxY, room.y + room.h);
    });

    floor.paths.forEach((path) => {
      path.points.forEach((point) => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    });

    floor.stairs.forEach((stair) => {
      minX = Math.min(minX, stair.x);
      minY = Math.min(minY, stair.y);
      maxX = Math.max(maxX, stair.x);
      maxY = Math.max(maxY, stair.y);
    });

    const contentWidth = (maxX - minX + 1) * this.tileSize;
    const contentHeight = (maxY - minY + 1) * this.tileSize;

    this.worldOffset.x = Math.floor((this.scale.width - contentWidth) / 2) -
      minX * this.tileSize;
    this.worldOffset.y = Math.floor((this.scale.height - contentHeight) / 2) -
      minY * this.tileSize;

    const padding = 2 * this.tileSize;
    this.floorBounds = {
      minX: this.worldToWorldX(minX) - padding,
      minY: this.worldToWorldY(minY) - padding,
      width: this.worldToWorldX(maxX + 1) - this.worldToWorldX(minX) +
        padding * 2,
      height: this.worldToWorldY(maxY + 1) - this.worldToWorldY(minY) +
        padding * 2,
    };
  }

  drawFloor(floor) {
    const size = this.tileSize;
    this.cameras.main.setBackgroundColor('#050505');
    const wallSegments = [];
    const openSegments = [];
    const corridorTileSet = new Set(
      floor.corridorTiles.map((tile) => `${tile.x},${tile.y}`),
    );

    floor.rooms.forEach((room) => {
      this.queueRoomOutline(
        wallSegments,
        room,
        size,
        corridorTileSet,
      );

      for (let y = 0; y < room.h; y++) {
        for (let x = 0; x < room.w; x++) {
          const tile = room.maze[y][x];
          const worldX = this.worldToWorldX(room.x + x);
          const worldY = this.worldToWorldY(room.y + y);

          if (tile.type === 'floor') {
            this.graphics.fillStyle(this.floorTileColor, 1);
          } else {
            this.graphics.fillStyle(this.solidTileColor, 1);
          }
          this.graphics.fillRect(worldX, worldY, size - 1, size - 1);

          if (tile.hasItem) {
            this.graphics.fillStyle(0xffff00, 1);
            this.graphics.fillCircle(worldX + size / 2, worldY + size / 2, 4);
          }
        }
      }

      const openEdges = this.roomOpenEdges.get(room.id) ||
        new Set(room.openEdges || []);

      for (let y = 0; y < room.h; y++) {
        for (let x = 0; x < room.w; x++) {
          if (room.maze[y][x].type !== 'floor') {
            continue;
          }

          if (x + 1 < room.w && room.maze[y][x + 1]?.type === 'floor') {
            const isOpen = this.isRoomEdgeOpen(openEdges, x, y, x + 1, y);
            const wx = this.worldToWorldX(room.x + x + 1);
            const wy = this.worldToWorldY(room.y + y);
            this.queueEdgeSegment(
              isOpen ? openSegments : wallSegments,
              wx,
              wy,
              wx,
              wy + size,
              isOpen ? this.openEdgeLineColor : this.wallLineColor,
              this.wallLineThickness,
            );
          }

          if (y + 1 < room.h && room.maze[y + 1][x]?.type === 'floor') {
            const isOpen = this.isRoomEdgeOpen(openEdges, x, y, x, y + 1);
            const wx = this.worldToWorldX(room.x + x);
            const wy = this.worldToWorldY(room.y + y + 1);
            this.queueEdgeSegment(
              isOpen ? openSegments : wallSegments,
              wx,
              wy,
              wx + size,
              wy,
              isOpen ? this.openEdgeLineColor : this.wallLineColor,
              this.wallLineThickness,
            );
          }
        }
      }
    });

    floor.corridorTiles.forEach((tile) => {
      const wx = this.worldToWorldX(tile.x);
      const wy = this.worldToWorldY(tile.y);
      this.graphics.fillStyle(this.floorTileColor, 1);
      this.graphics.fillRect(wx, wy, size, size);
    });

    const corridorDrawnEdges = new Set();

    floor.corridorTiles.forEach((tile) => {
      const neighborOffsets = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ];

      neighborOffsets.forEach(({ dx, dy }) => {
        const nx = tile.x + dx;
        const ny = tile.y + dy;
        const edgeKey = this.makeTileEdgeKey(tile.x, tile.y, nx, ny);
        if (corridorDrawnEdges.has(edgeKey)) {
          return;
        }

        const neighborIsCorridor = corridorTileSet.has(`${nx},${ny}`);
        const neighborRoom = this.getRoomAtTile(floor, nx, ny);
        let isWall = true;

        if (neighborIsCorridor) {
          corridorDrawnEdges.add(edgeKey);
          isWall = this.corridorWallEdges.has(edgeKey);
        } else if (neighborRoom) {
          isWall = !this.isRoomDoorTransition(
            neighborRoom,
            nx,
            ny,
            tile.x,
            tile.y,
          );
        }

        if (dy === 0) {
          const wx = dx > 0
            ? this.worldToWorldX(tile.x + 1)
            : this.worldToWorldX(tile.x);
          const wy = this.worldToWorldY(tile.y);
          this.queueEdgeSegment(
            isWall ? wallSegments : openSegments,
            wx,
            wy,
            wx,
            wy + size,
            isWall ? this.wallLineColor : this.openEdgeLineColor,
            this.corridorWallLineThickness,
          );
        } else {
          const wx = this.worldToWorldX(tile.x);
          const wy = dy > 0
            ? this.worldToWorldY(tile.y + 1)
            : this.worldToWorldY(tile.y);
          this.queueEdgeSegment(
            isWall ? wallSegments : openSegments,
            wx,
            wy,
            wx + size,
            wy,
            isWall ? this.wallLineColor : this.openEdgeLineColor,
            this.corridorWallLineThickness,
          );
        }
      });
    });

    floor.corridorWalls?.forEach((wall) => {
      if (wall.y1 === wall.y2) {
        // Horizontally adjacent tiles — draw a vertical wall at the shared x edge
        const edgeX = this.worldToWorldX(Math.max(wall.x1, wall.x2));
        const edgeY = this.worldToWorldY(wall.y1);
        this.queueEdgeSegment(
          wallSegments,
          edgeX,
          edgeY,
          edgeX,
          edgeY + size,
          this.wallLineColor,
          this.corridorWallLineThickness,
        );
      } else {
        // Vertically adjacent tiles — draw a horizontal wall at the shared y edge
        const edgeX = this.worldToWorldX(wall.x1);
        const edgeY = this.worldToWorldY(Math.max(wall.y1, wall.y2));
        this.queueEdgeSegment(
          wallSegments,
          edgeX,
          edgeY,
          edgeX + size,
          edgeY,
          this.wallLineColor,
          this.corridorWallLineThickness,
        );
      }
    });

    openSegments.forEach((segment) => {
      this.drawEdgeSegment(
        segment.x1,
        segment.y1,
        segment.x2,
        segment.y2,
        segment.color,
        segment.thickness,
      );
    });
    this.drawConnectedWallSegments(wallSegments);

    floor.stairs.forEach((stair) => {
      const sx = this.worldToWorldX(stair.x);
      const sy = this.worldToWorldY(stair.y);

      this.graphics.fillStyle(stair.dir === 'up' ? 0x00aa00 : 0xaa5500, 1);
      this.graphics.fillRect(sx, sy, size - 1, size - 1);

      const stairText = this.add.text(
        sx + size / 2,
        sy + size / 2,
        stair.dir === 'up' ? '▲' : '▼',
        { fontSize: '16px', fill: '#fff' },
      );
      stairText.setOrigin(0.5);
      this.decorTexts.push(stairText);
    });

    // Label placed for testing purposes, comment out when not testing
    const endRoom = floor.rooms.find((room) => room.isEnd);
    if (endRoom && endRoom.endPos) {
      const exitText = this.add.text(
        this.worldToWorldX(endRoom.endPos.x) + size / 2,
        this.worldToWorldY(endRoom.endPos.y) + size / 2,
        'EXIT',
        {
          fontSize: '10px',
          fill: '#0ff',
          backgroundColor: '#000',
          padding: { x: 2, y: 2 },
        },
      );
      exitText.setOrigin(0.5);
      this.decorTexts.push(exitText);
    }

    const startRoom = floor.rooms.find((room) => room.isStart);
    if (startRoom && startRoom.startPos) {
      const entranceText = this.add.text(
        this.worldToWorldX(startRoom.startPos.x) + size / 2,
        this.worldToWorldY(startRoom.startPos.y) + size / 2,
        'ENTRANCE',
        {
          fontSize: '10px',
          fill: '#0f0',
          backgroundColor: '#000',
          padding: { x: 2, y: 2 },
        },
      );
      entranceText.setOrigin(0.5);
      this.decorTexts.push(entranceText);
    }
  }

  queueRoomOutline(segments, room, size, corridorTileSet) {
    const color = this.wallLineColor;
    const slots = this.getRoomBoundaryOpenSlots(room, corridorTileSet);

    this.queueBoundarySegments(
      segments,
      room,
      size,
      'top',
      slots.top || [],
      color,
    );
    this.queueBoundarySegments(
      segments,
      room,
      size,
      'right',
      slots.right || [],
      color,
    );
    this.queueBoundarySegments(
      segments,
      room,
      size,
      'bottom',
      slots.bottom || [],
      color,
    );
    this.queueBoundarySegments(
      segments,
      room,
      size,
      'left',
      slots.left || [],
      color,
    );
  }

  getRoomBoundaryOpenSlots(room, corridorTileSet) {
    const slots = {
      top: [],
      right: [],
      bottom: [],
      left: [],
    };

    for (let x = 0; x < room.w; x++) {
      const topTileX = room.x + x;
      const topTileY = room.y;
      if (
        room.maze[0]?.[x]?.type === 'floor' &&
        corridorTileSet.has(`${topTileX},${topTileY - 1}`) &&
        this.isRoomDoorTransition(
          room,
          topTileX,
          topTileY,
          topTileX,
          topTileY - 1,
        )
      ) {
        slots.top.push(x);
      }

      const bottomTileX = room.x + x;
      const bottomTileY = room.y + room.h - 1;
      if (
        room.maze[room.h - 1]?.[x]?.type === 'floor' &&
        corridorTileSet.has(`${bottomTileX},${bottomTileY + 1}`) &&
        this.isRoomDoorTransition(
          room,
          bottomTileX,
          bottomTileY,
          bottomTileX,
          bottomTileY + 1,
        )
      ) {
        slots.bottom.push(x);
      }
    }

    for (let y = 0; y < room.h; y++) {
      const leftTileX = room.x;
      const leftTileY = room.y + y;
      if (
        room.maze[y]?.[0]?.type === 'floor' &&
        corridorTileSet.has(`${leftTileX - 1},${leftTileY}`) &&
        this.isRoomDoorTransition(
          room,
          leftTileX,
          leftTileY,
          leftTileX - 1,
          leftTileY,
        )
      ) {
        slots.left.push(y);
      }

      const rightTileX = room.x + room.w - 1;
      const rightTileY = room.y + y;
      if (
        room.maze[y]?.[room.w - 1]?.type === 'floor' &&
        corridorTileSet.has(`${rightTileX + 1},${rightTileY}`) &&
        this.isRoomDoorTransition(
          room,
          rightTileX,
          rightTileY,
          rightTileX + 1,
          rightTileY,
        )
      ) {
        slots.right.push(y);
      }
    }

    return slots;
  }

  queueBoundarySegments(segments, room, size, side, openSlots, color) {
    const limit = side === 'top' || side === 'bottom' ? room.w : room.h;
    const slotSet = new Set(openSlots);
    let runStart = null;

    for (let i = 0; i <= limit; i++) {
      const isOpen = i < limit && slotSet.has(i);
      if (!isOpen && runStart === null) {
        runStart = i;
      }

      if ((isOpen || i === limit) && runStart !== null) {
        if (runStart !== i) {
          this.queueRoomBoundaryRun(
            segments,
            room,
            size,
            side,
            runStart,
            i,
            color,
          );
        }
        runStart = null;
      }
    }
  }

  queueRoomBoundaryRun(segments, room, size, side, start, end, color) {
    if (side === 'top') {
      this.queueEdgeSegment(
        segments,
        this.worldToWorldX(room.x + start),
        this.worldToWorldY(room.y),
        this.worldToWorldX(room.x + end),
        this.worldToWorldY(room.y),
        color,
        this.wallLineThickness,
      );
      return;
    }

    if (side === 'bottom') {
      this.queueEdgeSegment(
        segments,
        this.worldToWorldX(room.x + start),
        this.worldToWorldY(room.y + room.h),
        this.worldToWorldX(room.x + end),
        this.worldToWorldY(room.y + room.h),
        color,
        this.wallLineThickness,
      );
      return;
    }

    if (side === 'left') {
      this.queueEdgeSegment(
        segments,
        this.worldToWorldX(room.x),
        this.worldToWorldY(room.y + start),
        this.worldToWorldX(room.x),
        this.worldToWorldY(room.y + end),
        color,
        this.wallLineThickness,
      );
      return;
    }

    this.queueEdgeSegment(
      segments,
      this.worldToWorldX(room.x + room.w),
      this.worldToWorldY(room.y + start),
      this.worldToWorldX(room.x + room.w),
      this.worldToWorldY(room.y + end),
      color,
      this.wallLineThickness,
    );
  }

  queueEdgeSegment(
    segments,
    x1,
    y1,
    x2,
    y2,
    color,
    thickness = this.wallLineThickness,
  ) {
    segments.push({ x1, y1, x2, y2, color, thickness });
  }

  drawConnectedWallSegments(segments) {
    const mergedSegments = this.mergeWallSegments(segments);

    mergedSegments.forEach((segment) => {
      this.drawEdgeSegment(
        segment.x1,
        segment.y1,
        segment.x2,
        segment.y2,
        segment.color,
        segment.thickness,
      );
    });

    this.getWallConnectionPoints(mergedSegments).forEach(
      ({ x, y, thickness }) => {
        this.drawWallJunctionBlock(x, y, thickness);
      },
    );
  }

  mergeWallSegments(segments) {
    const groupedSegments = new Map();

    segments.forEach((segment) => {
      const isVertical = segment.x1 === segment.x2;
      const anchor = isVertical
        ? Math.round(segment.x1)
        : Math.round(segment.y1);
      const key = [
        isVertical ? 'v' : 'h',
        anchor,
        segment.color,
        segment.thickness || this.wallLineThickness,
      ].join(':');

      if (!groupedSegments.has(key)) {
        groupedSegments.set(key, []);
      }

      groupedSegments.get(key).push({
        start: isVertical
          ? Math.min(segment.y1, segment.y2)
          : Math.min(segment.x1, segment.x2),
        end: isVertical
          ? Math.max(segment.y1, segment.y2)
          : Math.max(segment.x1, segment.x2),
        anchor,
        isVertical,
        color: segment.color,
        thickness: segment.thickness || this.wallLineThickness,
      });
    });

    const mergedSegments = [];

    groupedSegments.forEach((group) => {
      group.sort((left, right) => left.start - right.start);

      let current = null;

      group.forEach((segment) => {
        if (!current) {
          current = { ...segment };
          return;
        }

        if (segment.start <= current.end) {
          current.end = Math.max(current.end, segment.end);
          return;
        }

        mergedSegments.push(
          current.isVertical
            ? {
              x1: current.anchor,
              y1: current.start,
              x2: current.anchor,
              y2: current.end,
              color: current.color,
              thickness: current.thickness,
            }
            : {
              x1: current.start,
              y1: current.anchor,
              x2: current.end,
              y2: current.anchor,
              color: current.color,
              thickness: current.thickness,
            },
        );
        current = { ...segment };
      });

      if (!current) {
        return;
      }

      mergedSegments.push(
        current.isVertical
          ? {
            x1: current.anchor,
            y1: current.start,
            x2: current.anchor,
            y2: current.end,
            color: current.color,
            thickness: current.thickness,
          }
          : {
            x1: current.start,
            y1: current.anchor,
            x2: current.end,
            y2: current.anchor,
            color: current.color,
            thickness: current.thickness,
          },
      );
    });

    return mergedSegments;
  }

  getWallConnectionPoints(segments) {
    const connectionPoints = new Map();

    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const point = this.getWallSegmentConnectionPoint(
          segments[i],
          segments[j],
        );
        if (!point) {
          continue;
        }

        const key = `${point.x},${point.y}`;
        const existing = connectionPoints.get(key);
        const thickness = Math.max(
          segments[i].thickness || 1,
          segments[j].thickness || 1,
        );
        const directions = new Set([
          ...(existing?.directions || []),
          ...this.getSegmentDirectionsAtPoint(segments[i], point),
          ...this.getSegmentDirectionsAtPoint(segments[j], point),
        ]);
        connectionPoints.set(
          key,
          existing
            ? {
              x: point.x,
              y: point.y,
              thickness: Math.max(existing.thickness, thickness),
              directions,
            }
            : { x: point.x, y: point.y, thickness, directions },
        );
      }
    }

    return [...connectionPoints.values()].filter(
      (point) => point.directions?.size >= 3,
    );
  }

  getSegmentDirectionsAtPoint(segment, point) {
    const directions = [];

    if (segment.x1 === segment.x2) {
      const minY = Math.min(segment.y1, segment.y2);
      const maxY = Math.max(segment.y1, segment.y2);
      if (point.y > minY) {
        directions.push('up');
      }
      if (point.y < maxY) {
        directions.push('down');
      }
      return directions;
    }

    const minX = Math.min(segment.x1, segment.x2);
    const maxX = Math.max(segment.x1, segment.x2);
    if (point.x > minX) {
      directions.push('left');
    }
    if (point.x < maxX) {
      directions.push('right');
    }

    return directions;
  }

  getWallSegmentConnectionPoint(segmentA, segmentB) {
    const aVertical = segmentA.x1 === segmentA.x2;
    const bVertical = segmentB.x1 === segmentB.x2;

    if (aVertical !== bVertical) {
      const vertical = aVertical ? segmentA : segmentB;
      const horizontal = aVertical ? segmentB : segmentA;
      const point = {
        x: Math.round(vertical.x1),
        y: Math.round(horizontal.y1),
      };

      if (
        this.isPointOnWallSegment(point, vertical) &&
        this.isPointOnWallSegment(point, horizontal)
      ) {
        return point;
      }

      return null;
    }

    const candidatePoints = [
      { x: Math.round(segmentA.x1), y: Math.round(segmentA.y1) },
      { x: Math.round(segmentA.x2), y: Math.round(segmentA.y2) },
      { x: Math.round(segmentB.x1), y: Math.round(segmentB.y1) },
      { x: Math.round(segmentB.x2), y: Math.round(segmentB.y2) },
    ];

    return candidatePoints.find((point) =>
      this.isPointOnWallSegment(point, segmentA) &&
      this.isPointOnWallSegment(point, segmentB)
    ) || null;
  }

  isPointOnWallSegment(point, segment) {
    if (segment.x1 === segment.x2) {
      return Math.round(segment.x1) === point.x &&
        point.y >= Math.min(segment.y1, segment.y2) &&
        point.y <= Math.max(segment.y1, segment.y2);
    }

    return Math.round(segment.y1) === point.y &&
      point.x >= Math.min(segment.x1, segment.x2) &&
      point.x <= Math.max(segment.x1, segment.x2);
  }

  drawEdgeSegment(x1, y1, x2, y2, color, thickness = this.wallLineThickness) {
    const half = Math.floor(thickness / 2);

    this.graphics.fillStyle(color, 1);

    if (x1 === x2) {
      const x = Math.round(x1) - half;
      const y = Math.min(y1, y2) - half;
      const height = Math.abs(y2 - y1) + thickness;
      this.graphics.fillRect(x, y, thickness, height);
      return;
    }

    if (y1 === y2) {
      const x = Math.min(x1, x2) - half;
      const y = Math.round(y1) - half;
      const width = Math.abs(x2 - x1) + thickness;
      this.graphics.fillRect(x, y, width, thickness);
    }
  }

  drawWallJunctionBlock(x, y, thickness = this.wallLineThickness) {
    const half = Math.floor(thickness / 2);

    this.graphics.fillStyle(this.wallLineColor, 1);
    this.graphics.fillRect(
      Math.round(x) - half,
      Math.round(y) - half,
      thickness,
      thickness,
    );
  }

  ensureLanternMaskTexture() {
    if (!this.textures.exists(this.lanternMaskKey)) {
      const radius = this.lanternRadius;
      const softness = this.lanternSoftness;
      const size = (radius + softness) * 2;
      this.lanternMaskSize = size;

      const lanternTexture = this.textures.createCanvas(
        this.lanternMaskKey,
        size,
        size,
      );
      const lanternContext = lanternTexture.context;
      const lanternGradient = lanternContext.createRadialGradient(
        size / 2,
        size / 2,
        radius * 0.2,
        size / 2,
        size / 2,
        radius + softness,
      );

      lanternGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      lanternGradient.addColorStop(0.45, 'rgba(255, 245, 210, 0.95)');
      lanternGradient.addColorStop(0.75, 'rgba(255, 215, 140, 0.45)');
      lanternGradient.addColorStop(1, 'rgba(255, 180, 80, 0)');

      lanternContext.clearRect(0, 0, size, size);
      lanternContext.fillStyle = lanternGradient;
      lanternContext.fillRect(0, 0, size, size);
      lanternTexture.refresh();
    } else {
      this.lanternMaskSize =
        this.textures.get(this.lanternMaskKey).getSourceImage().width;
    }

    if (!this.textures.exists(this.exploredMaskKey)) {
      const size = this.lanternMaskSize;
      const radius = this.lanternRadius;
      const softness = this.lanternSoftness;
      const exploredTexture = this.textures.createCanvas(
        this.exploredMaskKey,
        size,
        size,
      );
      const exploredContext = exploredTexture.context;
      const exploredGradient = exploredContext.createRadialGradient(
        size / 2,
        size / 2,
        radius * 0.15,
        size / 2,
        size / 2,
        radius + softness,
      );

      exploredGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      exploredGradient.addColorStop(0.45, 'rgba(255, 245, 210, 0.85)');
      exploredGradient.addColorStop(0.8, 'rgba(255, 210, 120, 0.4)');
      exploredGradient.addColorStop(1, 'rgba(255, 180, 80, 0)');

      exploredContext.clearRect(0, 0, size, size);
      exploredContext.fillStyle = exploredGradient;
      exploredContext.fillRect(0, 0, size, size);
      exploredTexture.refresh();
    }
  }

  ensureLootboxTexture() {
    if (this.textures.exists('lootbox')) {
      return;
    }

    const size = this.tileSize;
    const textureGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    textureGraphics.fillStyle(0xffeb3b, 1);
    textureGraphics.fillRect(2, 2, size - 4, size - 4);
    textureGraphics.lineStyle(2, 0xb38f00, 1);
    textureGraphics.strokeRect(2, 2, size - 4, size - 4);
    textureGraphics.generateTexture('lootbox', size, size);
    textureGraphics.destroy();
  }

  createLanternOverlay() {
    if (this.exploredOverlay) {
      this.exploredOverlay.destroy();
    }
    if (this.lanternGlow) {
      this.lanternGlow.destroy();
    }

    this.exploredOverlay = this.add.renderTexture(
      this.floorBounds.minX,
      this.floorBounds.minY,
      this.floorBounds.width,
      this.floorBounds.height,
    );
    this.exploredOverlay.setOrigin(0, 0);
    this.exploredOverlay.setDepth(1000);
    this.resetExploredOverlay();

    this.lanternGlow = this.add.image(0, 0, this.lanternMaskKey);
    this.lanternGlow.setDepth(1001);
    this.lanternGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.lanternGlow.setAlpha(0);
    this.lanternGlow.setScale(0.7);
  }

  resetExploredOverlay() {
    if (!this.exploredOverlay) {
      return;
    }
    this.exploredOverlay.clear();
    this.exploredOverlay.fill(this.darknessColor, this.exploredDarknessAlpha);
  }

  syncLantern() {
    if (!this.player || !this.exploredOverlay) {
      return;
    }

    const playerWorldX = this.player.x + this.lanternOffsetX;
    const playerWorldY = this.player.y + this.lanternOffsetY;

    this.resetExploredOverlay();
    this.exploredOverlay.erase(
      this.exploredMaskKey,
      playerWorldX - this.floorBounds.minX - this.lanternMaskSize / 2,
      playerWorldY - this.floorBounds.minY - this.lanternMaskSize / 2,
    );

    if (this.lanternGlow) {
      this.lanternGlow.setPosition(playerWorldX, playerWorldY);
    }
  }

  buildWalkableTiles(floor) {
    this.walkableTiles.clear();

    floor.rooms.forEach((room) => {
      for (let y = 0; y < room.h; y++) {
        for (let x = 0; x < room.w; x++) {
          if (room.maze[y][x].type === 'floor') {
            this.walkableTiles.add(`${room.x + x},${room.y + y}`);
          }
        }
      }
    });

    floor.corridorTiles.forEach((tile) => {
      this.walkableTiles.add(`${tile.x},${tile.y}`);
    });

    floor.stairs.forEach((stair) => {
      this.walkableTiles.add(`${stair.x},${stair.y}`);
    });
  }

  buildCorridorWallEdges(floor) {
    this.corridorWallEdges.clear();

    (floor.corridorWalls || []).forEach((wall) => {
      this.corridorWallEdges.add(
        this.makeTileEdgeKey(wall.x1, wall.y1, wall.x2, wall.y2),
      );
    });
  }

  makeTileEdgeKey(ax, ay, bx, by) {
    const a = `${ax},${ay}`;
    const b = `${bx},${by}`;
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  placePlayer(floor) {
    if (!this.player) {
      const startRoom = floor.rooms.find((room) => room.isStart);
      const spawnTile = startRoom?.startPos || this.findAnyFloorTile(floor);

      this.player = this.add.sprite(
        this.worldToWorldX(spawnTile.x) + this.tileSize / 2,
        this.worldToWorldY(spawnTile.y) + this.tileSize / 2,
        this.playerSpriteKey,
        0,
      );
      this.player.setDisplaySize(17, 17);
    } else {
      const targetDir = this.lastStairDir === 'down' ? 'up' : 'down';
      const stair = floor.stairs.find((candidate) =>
        candidate.dir === targetDir
      );
      const spawnTile = stair || this.findAnyFloorTile(floor);

      this.player.setPosition(
        this.worldToWorldX(spawnTile.x) + this.tileSize / 2,
        this.worldToWorldY(spawnTile.y) + this.tileSize / 2,
      );
    }

    this.applyPlayerFacing(this.playerFacing);
    this.player.setCrop();
    this.player.setDepth(1002);
  }

  updatePlayerVisual(dx, dy) {
    if (!this.player?.anims) {
      return;
    }

    if (dx < 0 || (dx === 0 && dy < 0)) {
      this.playerFacing = 'left';
    } else if (dx > 0 || (dx === 0 && dy > 0)) {
      this.playerFacing = 'right';
    }

    this.applyPlayerFacing(this.playerFacing);

    if (this.time.now < this.playerAttackLockUntil) {
      if (this.player.texture.key !== this.playerAttackSpriteKey) {
        this.player.setTexture(this.playerAttackSpriteKey, 0);
      }
      this.player.setCrop();
      if (
        this.player.anims.currentAnim?.key !== this.playerAttackAnimKey ||
        !this.player.anims.isPlaying
      ) {
        this.player.play(this.playerAttackAnimKey);
      }
      return;
    }

    if (dx === 0 && dy === 0) {
      if (this.player.texture.key !== this.playerIdleSpriteKey) {
        this.player.setTexture(this.playerIdleSpriteKey, 0);
      }
      this.player.setCrop(
        0,
        this.playerIdleCropTop,
        32,
        32 - this.playerIdleCropTop,
      );
      if (
        this.player.anims.currentAnim?.key !== this.playerIdleAnimKey ||
        !this.player.anims.isPlaying
      ) {
        this.player.play(this.playerIdleAnimKey);
      }
      return;
    }

    if (this.player.texture.key !== this.playerSpriteKey) {
      this.player.setTexture(this.playerSpriteKey, 0);
    }
    this.player.setCrop();
    if (
      this.player.anims.currentAnim?.key !== this.playerWalkAnimKey ||
      !this.player.anims.isPlaying
    ) {
      this.player.play(this.playerWalkAnimKey);
    }
  }

  applyPlayerFacing(direction) {
    if (!this.player) {
      return;
    }

    this.player.setFlipX(direction === 'left');
  }

  playPlayerAttackAnimation() {
    if (!this.player) {
      return;
    }

    this.playerAttackLockUntil = this.time.now + 280;
    if (this.player.texture.key !== this.playerAttackSpriteKey) {
      this.player.setTexture(this.playerAttackSpriteKey, 0);
    }
    this.player.setCrop();
    this.applyPlayerFacing(this.playerFacing);
    this.player.play(this.playerAttackAnimKey, true);
  }

  findAnyFloorTile(floor) {
    for (const room of floor.rooms) {
      for (let y = 0; y < room.h; y++) {
        for (let x = 0; x < room.w; x++) {
          if (room.maze[y][x].type === 'floor') {
            return { x: room.x + x, y: room.y + y };
          }
        }
      }
    }

    if (floor.corridorTiles.length > 0) {
      return floor.corridorTiles[0];
    }

    return { x: 20, y: 20 };
  }

  createEnemiesForFloor(floor) {
    this.monsterController?.createForFloor(floor);
    this.monsterController?.setGlobalAggro(this.monstersAlerted);
    this.enemies = this.monsterController?.enemies || [];
  }

  createLootboxesForFloor(floor) {
    this.lootboxes = [];

    (floor.chests || []).forEach((chest) => {
      const boxTier = Math.max(1, Math.min(6, chest.boxTier || 1));
      const rarityKey = `rarity_${boxTier}`;
      const rarityPool = Array.isArray(globalThis.lootTables?.[rarityKey])
        ? globalThis.lootTables[rarityKey]
        : [];
      const rolledLootbox = rarityPool.length > 0
        ? rarityPool[Math.floor(Math.random() * rarityPool.length)]
        : null;

      const lootbox = new Lootbox(
        this,
        this.worldToWorldX(chest.x) + this.tileSize / 2,
        this.worldToWorldY(chest.y) + this.tileSize / 2,
        {
          box_tier: rolledLootbox?.box_tier || boxTier,
          size: rolledLootbox?.size || 1,
          luck: rolledLootbox?.luck || 0,
          total_items: rolledLootbox?.total_items || 3,
          loot: rolledLootbox?.loot || chest.loot ||
            { [`Tier ${boxTier}`]: 3 },
          isTrap: chest.isTrap || false,
        },
      );

      lootbox.setSize(this.tileSize - 4, this.tileSize - 4);
      lootbox.setDepth(19);
      lootbox.chestId = chest.id;

      if (chest.opened) {
        lootbox.opened = true;
        lootbox.setVisible(false);
      } else {
        lootbox.on('lootboxOpened', () => {
          chest.opened = true;

          if (!lootbox.boxData?.isTrap) {
            const awardedGold = this.awardLootboxGold(
              lootbox.boxData?.box_tier,
            );
            const awardedExp = this.awardLootboxExp(lootbox.boxData?.box_tier);
            if (awardedGold > 0) {
              this.showFloatingGoldGain(lootbox.x, lootbox.y, awardedGold);
            }
            if (awardedExp > 0) {
              this.showFloatingExpGain(lootbox.x, lootbox.y - 10, awardedExp);
            }
          }

          if (lootbox.boxData?.isTrap) {
            this.alertAllMonstersFromTrap();
          }
        });
        lootbox.on('lootboxOverflow', (overflowItems) => {
          this.showDiscardUI(overflowItems);
        });
      }

      this.lootboxes.push(lootbox);
    });
  }

  updateEnemies(floor) {
    this.monsterController?.update(floor);
    this.enemies = this.monsterController?.enemies || [];
  }

  awardLootboxGold(boxTier) {
    const player = globalThis.gameState?.player;
    if (!player) {
      return 0;
    }

    const safeTier = Phaser.Math.Clamp(Number(boxTier) || 1, 1, 6);
    const baseRangeByTier = {
      1: [4, 10],
      2: [8, 18],
      3: [14, 28],
      4: [22, 42],
      5: [34, 62],
      6: [48, 90],
    };
    const [minGold, maxGold] = baseRangeByTier[safeTier] || [4, 10];
    const rolledGold = Phaser.Math.Between(minGold, maxGold);
    const levelMultiplier = this.getPlayerRewardMultiplier(player);
    const goldBonus = Number(player.equipment?.accessory?.stats?.goldBonus) ||
      0;
    const totalGold = Math.max(
      1,
      Math.floor(rolledGold * levelMultiplier * (1 + Math.max(0, goldBonus))),
    );

    if (typeof player.addGold === 'function') {
      player.addGold(totalGold);
    } else {
      player.gold = Math.max(0, Number(player.gold) || 0) + totalGold;
    }
    return totalGold;
  }

  awardLootboxExp(boxTier) {
    const player = globalThis.gameState?.player;
    if (!player) {
      return 0;
    }

    const safeTier = Phaser.Math.Clamp(Number(boxTier) || 1, 1, 6);
    const rolledExp = Phaser.Math.Between(1, 10) * safeTier;
    const levelMultiplier = this.getPlayerRewardMultiplier(player);
    const expBonus = Number(player.equipment?.accessory?.stats?.expBonus) || 0;
    const totalExp = Math.max(
      1,
      Math.floor(rolledExp * levelMultiplier * (1 + Math.max(0, expBonus))),
    );

    if (typeof player.addExp === 'function') {
      player.addExp(totalExp);
    } else {
      player.exp = Math.max(0, Number(player.exp) || 0) + totalExp;
    }

    return totalExp;
  }

  getPlayerRewardMultiplier(player = globalThis.gameState?.player) {
    if (!player) {
      return 1;
    }

    if (typeof player.getLevelScalingMultiplier === 'function') {
      return player.getLevelScalingMultiplier();
    }

    const level = Math.max(1, Number(player.level) || 1);
    return 1 + (level - 1) * 0.1;
  }

  awardMonsterRewards(enemy) {
    const player = globalThis.gameState?.player;
    if (!player || !enemy?.sprite) {
      return { exp: 0, gold: 0 };
    }

    const levelMultiplier = this.getPlayerRewardMultiplier(player);
    const expBonus = Number(player.equipment?.accessory?.stats?.expBonus) || 0;
    const goldBonus = Number(player.equipment?.accessory?.stats?.goldBonus) ||
      0;
    const expAward = Math.max(
      1,
      Math.floor(
        Phaser.Math.Between(1, 10) * levelMultiplier *
          (1 + Math.max(0, expBonus)),
      ),
    );
    const goldAward = Math.max(
      1,
      Math.floor(
        Phaser.Math.Between(1, 10) * levelMultiplier *
          (1 + Math.max(0, goldBonus)),
      ),
    );

    if (typeof player.addExp === 'function') {
      player.addExp(expAward);
    } else {
      player.exp = Math.max(0, Number(player.exp) || 0) + expAward;
    }

    if (typeof player.addGold === 'function') {
      player.addGold(goldAward);
    } else {
      player.gold = Math.max(0, Number(player.gold) || 0) + goldAward;
    }

    this.showFloatingExpGain(enemy.sprite.x, enemy.sprite.y - 8, expAward);
    this.showFloatingGoldGain(enemy.sprite.x, enemy.sprite.y + 4, goldAward);

    return { exp: expAward, gold: goldAward };
  }

  showFloatingGoldGain(x, y, amount) {
    const text = this.add.text(x, y - 8, `+${amount} gold`, {
      fontSize: '6px',
      fill: '#ffd44d',
      stroke: '#000',
      strokeThickness: 1,
    }).setOrigin(0.5).setDepth(2000);

    this.tweens.add({
      targets: text,
      y: y - 20,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  showFloatingExpGain(x, y, amount) {
    const text = this.add.text(x, y - 8, `+${amount} exp`, {
      fontSize: '6px',
      fill: '#7dd3fc',
      stroke: '#000',
      strokeThickness: 1,
    }).setOrigin(0.5).setDepth(2000);

    this.tweens.add({
      targets: text,
      y: y - 20,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  alertAllMonstersFromTrap() {
    this.monstersAlerted = true;
    this.monsterController?.setGlobalAggro(true);
  }

  updateCurrentRoom(force = false) {
    if (!this.player || !this.currentFloorData) {
      return;
    }

    const room = this.getRoomAtTile(
      this.currentFloorData,
      this.worldToTileX(this.player.x),
      this.worldToTileY(this.player.y),
    );
    const nextRoomId = room?.id || null;

    if (!force && this.currentRoom?.id === nextRoomId) {
      return;
    }

    this.currentRoom = room
      ? {
        id: room.id,
        index: room.roomIndex ?? null,
        label: room.roomLabel || `Room ${room.roomIndex ?? room.id}`,
      }
      : null;

    if (this.currentRoom) {
      this.activatedRooms.add(this.currentRoom.id);
    }

    if (this.currentRoomText) {
      this.currentRoomText.setText(
        this.currentRoom ? `Room: ${this.currentRoom.label}` : 'Room: Corridor',
      );
    }
  }

  update() {
    if (!this.player || !this.currentFloorData) {
      return;
    }

    if (this.discardUIActive) {
      this.syncLantern();
      return;
    }

    let dx = 0;
    let dy = 0;

    if (this.keys.w.isDown) dy = -1;
    if (this.keys.s.isDown) dy = 1;
    if (this.keys.a.isDown) dx = -1;
    if (this.keys.d.isDown) dx = 1;

    if (dx !== 0 && dy !== 0) {
      dx *= 0.7;
      dy *= 0.7;
    }

    if (dx !== 0 || dy !== 0) {
      const newX = this.player.x + dx * this.playerSpeed;
      const newY = this.player.y + dy * this.playerSpeed;

      this.movePlayerWithCollisions(newX, newY);
    }

    this.updatePlayerVisual(dx, dy);

    this.player.x = Phaser.Math.Clamp(
      this.player.x,
      this.floorBounds.minX + 8,
      this.floorBounds.minX + this.floorBounds.width - 8,
    );
    this.player.y = Phaser.Math.Clamp(
      this.player.y,
      this.floorBounds.minY + 8,
      this.floorBounds.minY + this.floorBounds.height - 8,
    );

    this.checkStairs();
    this.checkExit();
    this.checkEntrance();
    this.checkLootboxes();
    this.updateCurrentRoom();
    this.updateEnemies(this.currentFloorData);
    this.resolvePlayerMonsterCollisions();

    if (Phaser.Input.Keyboard.JustDown(this.keys.e)) {
      if (this.nearLootbox) {
        this.nearLootbox.open();
      } else if (this.nearExit) {
        this.scene.start('Play');
      } else if (this.nearStair) {
        this.useStairs(this.nearStair);
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.q) && this.nearEntrance) {
      this.scene.start('Play');
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.r)) {
      this.scene.launch('Inventory', { returnScene: 'Dungeons' });
      this.scene.sleep();
    }

    this.syncLantern();
  }

  movePlayerWithCollisions(targetX, targetY) {
    this.moveEntityWithCollisions(this.player, targetX, targetY, {
      radius: this.playerCollisionRadius,
      collisionOffsetY: this.playerCollisionOffsetY,
      blockByPlayer: false,
      blockByEnemies: true,
    });
  }

  moveEnemyWithCollisions(enemy, targetX, targetY) {
    if (!enemy?.sprite) {
      return;
    }

    this.moveEntityWithCollisions(enemy.sprite, targetX, targetY, {
      radius: this.monsterCollisionRadius,
      collisionOffsetY: this.monsterCollisionOffsetY,
      blockByPlayer: true,
      blockByEnemies: true,
      ignoreEnemyId: enemy.id,
    });
  }

  moveEntityWithCollisions(entity, targetX, targetY, options = {}) {
    if (!entity) {
      return;
    }

    if (this.canEntityMoveTo(entity, targetX, targetY, options)) {
      entity.x = targetX;
      entity.y = targetY;
    } else {
      if (this.canEntityMoveTo(entity, targetX, entity.y, options)) {
        entity.x = targetX;
      }
      if (this.canEntityMoveTo(entity, entity.x, targetY, options)) {
        entity.y = targetY;
      }
    }

    const radius = options.radius || this.playerCollisionRadius;
    entity.x = Phaser.Math.Clamp(
      entity.x,
      this.floorBounds.minX + radius,
      this.floorBounds.minX + this.floorBounds.width - radius,
    );
    entity.y = Phaser.Math.Clamp(
      entity.y,
      this.floorBounds.minY + radius,
      this.floorBounds.minY + this.floorBounds.height - radius,
    );
  }

  getPlayerCombatProfile() {
    const playerData = globalThis.gameState?.player || {};
    const baseLevel = Math.max(1, Number(playerData.level) || 1);
    const baseHp = Math.max(0, Number(playerData.hp) || 0);
    const baseMaxHp = Math.max(
      1,
      Number(playerData.maxHP ?? playerData.maxHp) || 100,
    );
    const equipment = playerData.equipment || {};
    const profile = {
      level: baseLevel,
      hp: baseHp,
      maxHp: baseMaxHp,
      atk: Math.max(1, Number(playerData.atk) || 10),
      def: Math.max(0, Number(playerData.def) || 5),
      luck: Math.max(0, Number(playerData.luck) || 0),
    };

    if (equipment.weapon?.stats) {
      const weaponBaseAtk = Number(equipment.weapon.stats.atkBonus) || 0;
      const weaponAtkPct = Number(equipment.weapon.stats.atkPctBonus) || 0;

      if (weaponAtkPct > 0) {
        profile.atk = Math.floor(
          (profile.atk + weaponBaseAtk) * (1 + weaponAtkPct),
        );
      } else {
        profile.atk += weaponBaseAtk;
      }

      profile.luck += equipment.weapon.stats.luckBonus || 0;
    }

    if (equipment.armor?.stats) {
      const armorBaseDef = Number(equipment.armor.stats.defBonus) || 0;
      const armorBaseHp = Number(equipment.armor.stats.hpBonus) || 0;
      const armorDefPct = Number(equipment.armor.stats.defPctBonus) || 0;
      const armorHpPct = Number(equipment.armor.stats.hpPctBonus) || 0;

      if (armorDefPct > 0) {
        profile.def = Math.floor(
          (profile.def + armorBaseDef) * (1 + armorDefPct),
        );
      } else {
        profile.def += armorBaseDef;
      }

      if (armorHpPct > 0) {
        profile.maxHp = Math.floor(
          (profile.maxHp + armorBaseHp) * (1 + armorHpPct),
        );
      } else {
        profile.maxHp += armorBaseHp;
      }

      profile.luck += equipment.armor.stats.luckBonus || 0;
    }

    if (equipment.accessory?.stats) {
      profile.atk += equipment.accessory.stats.atkBonus || 0;
      profile.def += equipment.accessory.stats.defBonus || 0;
      profile.luck += equipment.accessory.stats.luckBonus || 0;
    }

    profile.hp = Math.min(profile.maxHp, profile.hp);
    profile.dodgeChance = Math.min(0.25, 0.02 + profile.luck * 0.005);

    return profile;
  }

  syncPlayerCombatProfile(profile) {
    const playerData = globalThis.gameState?.player;
    if (!playerData || !profile) {
      return;
    }

    playerData.hp = profile.hp;
    playerData.maxHP = profile.maxHp;
    if ('maxHp' in playerData) {
      playerData.maxHp = profile.maxHp;
    }
  }

  handlePlayerDefeat() {
    if (this.isPlayerDefeated) {
      return;
    }
    this.isPlayerDefeated = true;

    const playerData = globalThis.gameState?.player;
    if (playerData) {
      // Bag is temporary loot during dungeon runs.
      playerData.inventory = [];
      const baseMaxHp = Math.max(
        1,
        Number(playerData.maxHP ?? playerData.maxHp) || 50,
      );
      playerData.hp = baseMaxHp;
      playerData.maxHP = baseMaxHp;
      if ('maxHp' in playerData) {
        playerData.maxHp = baseMaxHp;
      }
    }

    this.scene.start('Play');
  }

  resolveCombatDamage(incomingDamage, defense) {
    return Math.max(1, Math.floor(incomingDamage) - Math.max(0, defense));
  }

  rollPlayerDodge(playerProfile) {
    return Math.random() < (playerProfile?.dodgeChance || 0);
  }

  cleanupDefeatedEnemy(enemy) {
    if (!enemy) {
      return;
    }

    enemy.isCollidingWithPlayer = false;
    enemy.path = [];
    enemy.pathTargetKey = null;

    if (enemy.sprite) {
      enemy.sprite.destroy();
    }

    this.enemies = this.enemies.filter((candidate) => candidate !== enemy);
    if (this.monsterController) {
      this.monsterController.enemies = this.enemies;
    }
  }

  showFloatingDamage(x, y, amount, dodged) {
    const label = dodged ? 'DODGE!' : `-${amount}`;
    const color = dodged ? '#fff' : '#ff4444';
    const text = this.add.text(x, y - 6, label, {
      fontSize: '5px',
      fill: color,
      stroke: '#000',
      strokeThickness: 1,
    }).setOrigin(0.5).setDepth(2000);

    this.tweens.add({
      targets: text,
      y: y - 18,
      alpha: 0,
      duration: 700,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  handlePlayerMonsterContact(enemy, normalX, normalY) {
    if (this.isPlayerDefeated) {
      return;
    }

    const playerProfile = this.getPlayerCombatProfile();
    const playerDamage = Math.max(1, Math.floor(playerProfile.atk));
    const didPlayerDodge = this.rollPlayerDodge(playerProfile);

    this.playPlayerAttackAnimation();
    this.playEnemyHurtAnimation(enemy);

    enemy.hp = Math.max(0, (enemy.hp || 0) - playerDamage);
    this.showFloatingDamage(
      enemy.sprite.x,
      enemy.sprite.y,
      playerDamage,
      false,
    );

    if (!didPlayerDodge) {
      const monsterDamage = this.resolveCombatDamage(
        enemy.atk || 0,
        playerProfile.def,
      );
      playerProfile.hp = Math.max(0, playerProfile.hp - monsterDamage);
      this.showFloatingDamage(
        this.player.x,
        this.player.y,
        monsterDamage,
        false,
      );
    } else {
      this.showFloatingDamage(this.player.x, this.player.y, 0, true);
    }

    this.syncPlayerCombatProfile(playerProfile);

    if (playerProfile.hp <= 0) {
      this.handlePlayerDefeat();
      return;
    }

    const knockbackDistance = this.monsterHitPushback;
    enemy.path = [];
    enemy.pathTargetKey = null;
    this.moveEntityWithCollisions(
      enemy.sprite,
      enemy.sprite.x - normalX * knockbackDistance,
      enemy.sprite.y - normalY * knockbackDistance,
      {
        radius: this.monsterCollisionRadius,
        collisionOffsetY: this.monsterCollisionOffsetY,
        blockByPlayer: false,
        blockByEnemies: true,
        ignoreEnemyId: enemy.id,
      },
    );

    if (enemy.hp <= 0) {
      this.awardMonsterRewards(enemy);
      this.cleanupDefeatedEnemy(enemy);
    }
  }

  playEnemyHurtAnimation(enemy) {
    if (!enemy?.sprite) {
      return;
    }

    enemy.hurtLockUntil = this.time.now + 260;
    enemy.sprite.setTexture(this.enemyHurtSpriteKey, 0);
    const animKey = this.enemyHurtAnimKeys[enemy.facing] ||
      this.enemyHurtAnimKeys.down;
    enemy.sprite.play(animKey, true);
  }

  showDiscardUI(overflowItems) {
    if (this.discardUIActive) {
      this.discardUIPending.push(...overflowItems);
      this._buildDiscardUI();
      return;
    }
    this.discardUIActive = true;
    this.discardUIPending = [...overflowItems];
    this.discardUIElements = [];
    this._buildDiscardUI();
  }

  _buildDiscardUI() {
    (this.discardUIElements || []).forEach((el) => el.destroy());
    this.discardUIElements = [];

    const player = globalThis.gameState.player;
    const pending = this.discardUIPending;
    const bag = player.inventory || [];
    const bagCap = typeof player.bagSlots === 'number'
      ? player.bagSlots
      : (typeof player.maxInventory === 'number' ? player.maxInventory : 20);

    const reg = (el, depth) => {
      el.setScrollFactor(0).setDepth(depth ?? 3002);
      this.discardUIElements.push(el);
      return el;
    };
    const tierColor = (tier) =>
      ['#888', '#8f8', '#88f', '#f8f', '#ff8', '#f88'][(tier || 1) - 1] ||
      '#fff';

    reg(this.add.rectangle(400, 300, 800, 600, 0x000000, 0.78), 3000);
    reg(
      this.add.rectangle(400, 305, 690, 415, 0x111111, 0.97)
        .setStrokeStyle(2, 0x777777),
      3001,
    );
    reg(this.add.rectangle(357, 305, 2, 390, 0x444444, 0.9), 3001);

    reg(
      this.add.text(400, 113, 'BAG FULL', {
        fontSize: '20px',
        fill: '#ff4444',
        fontStyle: 'bold',
      }).setOrigin(0.5),
    );
    const statusStr = pending.length === 0
      ? 'All items collected!'
      : `${pending.length} item(s) did not fit  -  drop bag items to make room, or skip to discard`;
    reg(
      this.add.text(400, 138, statusStr, {
        fontSize: '10px',
        fill: '#aaa',
      }).setOrigin(0.5),
    );

    const rowH = 27;
    const startY = 173;
    const maxRows = 9;

    reg(
      this.add.text(205, 158, 'CHEST ITEMS', {
        fontSize: '11px',
        fill: '#ff0',
        fontStyle: 'bold',
      }).setOrigin(0.5),
    );

    pending.slice(0, maxRows).forEach((item, i) => {
      const y = startY + i * rowH;
      reg(
        this.add.text(70, y, item.name || 'Unknown', {
          fontSize: '10px',
          fill: tierColor(item.tier),
          fixedWidth: 215,
        }).setOrigin(0, 0.5),
      );
      const skipBtn = reg(
        this.add.text(320, y, 'SKIP', {
          fontSize: '9px',
          fill: '#ff8888',
          backgroundColor: '#2a2a2a',
          padding: { x: 5, y: 2 },
        }).setOrigin(0.5).setInteractive(),
      );
      skipBtn.on('pointerdown', () => {
        this.discardUIPending = this.discardUIPending.filter((x) => x !== item);
        this._buildDiscardUI();
      });
    });
    if (pending.length > maxRows) {
      reg(
        this.add.text(
          205,
          startY + maxRows * rowH,
          `+${pending.length - maxRows} more`,
          { fontSize: '9px', fill: '#888' },
        ).setOrigin(0.5),
      );
    }

    reg(
      this.add.text(562, 155, `YOUR BAG  (${bag.length}/${bagCap})`, {
        fontSize: '11px',
        fill: '#ff0',
        fontStyle: 'bold',
      }).setOrigin(0.5),
    );
    reg(
      this.add.text(562, 167, pending.length > 0 ? 'click item to drop' : '', {
        fontSize: '9px',
        fill: '#666',
      }).setOrigin(0.5),
    );

    bag.slice(0, maxRows).forEach((item, i) => {
      const y = startY + i * rowH;
      const canDrop = pending.length > 0;
      const row = reg(
        this.add.rectangle(562, y, 305, 22, canDrop ? 0x2a2a2a : 0x1e1e1e, 0.9)
          .setStrokeStyle(1, 0x3a3a3a).setInteractive(),
      );
      if (canDrop) {
        row.on('pointerover', () => row.setFillStyle(0x3d3d3d, 0.9));
        row.on('pointerout', () => row.setFillStyle(0x2a2a2a, 0.9));
        row.on('pointerdown', () => {
          const inv = globalThis.gameState.player.inventory || [];
          const idx = inv.indexOf(item);
          if (idx !== -1) inv.splice(idx, 1);
          if (this.discardUIPending.length > 0) {
            const next = this.discardUIPending.shift();
            const addFn = globalThis.gameState.player.addItem;
            if (typeof addFn === 'function') {
              addFn.call(globalThis.gameState.player, next);
            } else {
              (globalThis.gameState.player.inventory || []).push(next);
            }
          }
          this._buildDiscardUI();
        });
      }
      reg(
        this.add.text(416, y, item.name || 'Unknown', {
          fontSize: '10px',
          fill: canDrop ? tierColor(item.tier) : '#555',
          fixedWidth: 282,
          align: 'left',
        }).setOrigin(0, 0.5),
      );
    });
    if (bag.length > maxRows) {
      reg(
        this.add.text(
          562,
          startY + maxRows * rowH,
          `+${bag.length - maxRows} more (open Inventory to manage)`,
          { fontSize: '9px', fill: '#888' },
        ).setOrigin(0.5),
      );
    }

    const doneLabel = pending.length > 0
      ? `DONE  (${pending.length} item${
        pending.length !== 1 ? 's' : ''
      } discarded)`
      : 'DONE';
    const doneBtn = reg(
      this.add.text(400, 492, doneLabel, {
        fontSize: '13px',
        fill: pending.length > 0 ? '#ff8888' : '#88ff88',
        backgroundColor: '#222',
        padding: { x: 20, y: 7 },
      }).setOrigin(0.5).setInteractive(),
    );
    doneBtn.on('pointerdown', () => this.closeDiscardUI());
  }

  closeDiscardUI() {
    (this.discardUIElements || []).forEach((el) => el.destroy());
    this.discardUIElements = [];
    this.discardUIPending = [];
    this.discardUIActive = false;
  }

  canEntityMoveTo(entity, worldX, worldY, options = {}) {
    const collisionOffsetY = options.collisionOffsetY || 0;
    const collisionWorldX = worldX;
    const collisionWorldY = worldY + collisionOffsetY;
    const tileX = this.worldToTileX(collisionWorldX);
    const tileY = this.worldToTileY(collisionWorldY);

    if (!this.walkableTiles.has(`${tileX},${tileY}`)) {
      return false;
    }

    const currentTileX = this.worldToTileX(entity.x);
    const currentTileY = this.worldToTileY(entity.y + collisionOffsetY);

    if (currentTileX !== tileX || currentTileY !== tileY) {
      if (!this.canTraverseTileEdge(currentTileX, currentTileY, tileX, tileY)) {
        return false;
      }
    }

    const radius = options.radius || this.playerCollisionRadius;

    if (
      !this.isCircleWithinWalkableArea(collisionWorldX, collisionWorldY, radius)
    ) {
      return false;
    }

    if (options.blockByPlayer && this.player && entity !== this.player) {
      const minDist = radius + this.playerCollisionRadius;
      const playerCollisionY = this.player.y + this.playerCollisionOffsetY;
      const sharesCollisionSpace = this.areCollisionTilesConnected(
        collisionWorldX,
        collisionWorldY,
        this.player.x,
        playerCollisionY,
      );
      if (
        sharesCollisionSpace &&
        Phaser.Math.Distance.Between(
            collisionWorldX,
            collisionWorldY,
            this.player.x,
            playerCollisionY,
          ) < minDist
      ) {
        return false;
      }
    }

    if (options.blockByEnemies && Array.isArray(this.enemies)) {
      for (const enemy of this.enemies) {
        if (!enemy?.sprite || !enemy.sprite.visible) {
          continue;
        }
        if (enemy.id && enemy.id === options.ignoreEnemyId) {
          continue;
        }
        if (enemy.sprite === entity) {
          continue;
        }

        const minDist = radius + this.monsterCollisionRadius;
        const enemyCollisionY = enemy.sprite.y + this.monsterCollisionOffsetY;
        const sharesCollisionSpace = this.areCollisionTilesConnected(
          collisionWorldX,
          collisionWorldY,
          enemy.sprite.x,
          enemyCollisionY,
        );
        if (
          sharesCollisionSpace &&
          Phaser.Math.Distance.Between(
              collisionWorldX,
              collisionWorldY,
              enemy.sprite.x,
              enemyCollisionY,
            ) < minDist
        ) {
          return false;
        }
      }
    }

    return true;
  }

  isCircleWithinWalkableArea(worldX, worldY, radius) {
    const centerTileX = this.worldToTileX(worldX);
    const centerTileY = this.worldToTileY(worldY);
    const diagonal = radius * 0.7071;
    const samplePoints = [
      { x: worldX, y: worldY },
      { x: worldX - radius, y: worldY },
      { x: worldX + radius, y: worldY },
      { x: worldX, y: worldY - radius },
      { x: worldX, y: worldY + radius },
      { x: worldX - diagonal, y: worldY - diagonal },
      { x: worldX + diagonal, y: worldY - diagonal },
      { x: worldX - diagonal, y: worldY + diagonal },
      { x: worldX + diagonal, y: worldY + diagonal },
    ];

    return samplePoints.every((point) =>
      this.isPointWalkableFromTile(point.x, point.y, centerTileX, centerTileY)
    );
  }

  isPointWalkableFromTile(worldX, worldY, originTileX, originTileY) {
    const tileX = this.worldToTileX(worldX);
    const tileY = this.worldToTileY(worldY);

    if (!this.walkableTiles.has(`${tileX},${tileY}`)) {
      return false;
    }

    const dx = tileX - originTileX;
    const dy = tileY - originTileY;

    if (dx === 0 && dy === 0) {
      return true;
    }

    if (Math.abs(dx) + Math.abs(dy) === 1) {
      return this.canTraverseTileEdge(originTileX, originTileY, tileX, tileY);
    }

    if (Math.abs(dx) === 1 && Math.abs(dy) === 1) {
      return (
        this.canTraverseTileEdge(
          originTileX,
          originTileY,
          originTileX + dx,
          originTileY,
        ) &&
        this.canTraverseTileEdge(
          originTileX + dx,
          originTileY,
          tileX,
          tileY,
        )
      ) || (
        this.canTraverseTileEdge(
          originTileX,
          originTileY,
          originTileX,
          originTileY + dy,
        ) &&
        this.canTraverseTileEdge(
          originTileX,
          originTileY + dy,
          tileX,
          tileY,
        )
      );
    }

    return false;
  }

  resolvePlayerMonsterCollisions() {
    if (!this.player || !Array.isArray(this.enemies)) {
      return;
    }

    const minDist = this.playerCollisionRadius + this.monsterCollisionRadius;
    // The movement system blocks overlap so the closest two entities can be is
    // exactly minDist apart.  We treat "touching at that boundary" as contact.
    const contactDist = minDist + 2;

    [...this.enemies].forEach((enemy) => {
      if (!enemy?.sprite || !enemy.sprite.visible) {
        return;
      }

      const playerCollisionPoint = {
        x: this.player.x,
        y: this.player.y + this.playerCollisionOffsetY,
      };
      const enemyCollisionPoint = {
        x: enemy.sprite.x,
        y: enemy.sprite.y + this.monsterCollisionOffsetY,
      };

      if (
        !this.areCollisionTilesConnected(
          playerCollisionPoint.x,
          playerCollisionPoint.y,
          enemyCollisionPoint.x,
          enemyCollisionPoint.y,
        )
      ) {
        enemy.isCollidingWithPlayer = false;
        return;
      }

      const dx = playerCollisionPoint.x - enemyCollisionPoint.x;
      const dy = playerCollisionPoint.y - enemyCollisionPoint.y;
      const dist = Math.hypot(dx, dy);

      if (dist > contactDist) {
        enemy.isCollidingWithPlayer = false;
        return;
      }

      const safeDist = dist || 0.0001;
      const nx = dx / safeDist;
      const ny = dy / safeDist;

      enemy.isCollidingWithPlayer = true;

      if ((enemy.nextContactTime || 0) <= this.time.now) {
        enemy.nextContactTime = this.time.now + this.playerMonsterContactCooldown;
        this.handlePlayerMonsterContact(enemy, nx, ny);

        if (!enemy?.sprite || !enemy.sprite.visible) {
          return;
        }
      }

      const postDx = this.player.x - enemy.sprite.x;
      const postDy = (this.player.y + this.playerCollisionOffsetY) -
        (enemy.sprite.y + this.monsterCollisionOffsetY);
      const postDist = Math.hypot(postDx, postDy) || safeDist;
      const overlap = minDist - postDist;

      if (overlap <= 0) {
        return;
      }

      const pushNx = postDx / postDist;
      const pushNy = postDy / postDist;
      const push = overlap * 0.5;

      this.moveEntityWithCollisions(
        this.player,
        this.player.x + pushNx * push,
        this.player.y + pushNy * push,
        {
          radius: this.playerCollisionRadius,
          collisionOffsetY: this.playerCollisionOffsetY,
          blockByPlayer: false,
          blockByEnemies: true,
        },
      );

      this.moveEntityWithCollisions(
        enemy.sprite,
        enemy.sprite.x - pushNx * push,
        enemy.sprite.y - pushNy * push,
        {
          radius: this.monsterCollisionRadius,
          collisionOffsetY: this.monsterCollisionOffsetY,
          blockByPlayer: true,
          blockByEnemies: true,
          ignoreEnemyId: enemy.id,
        },
      );
    });
  }

  areCollisionTilesConnected(ax, ay, bx, by) {
    const aTileX = this.worldToTileX(ax);
    const aTileY = this.worldToTileY(ay);
    const bTileX = this.worldToTileX(bx);
    const bTileY = this.worldToTileY(by);

    const dx = bTileX - aTileX;
    const dy = bTileY - aTileY;
    const manhattan = Math.abs(dx) + Math.abs(dy);

    if (manhattan === 0) {
      return true;
    }

    if (manhattan === 1) {
      return this.canTraverseTileEdge(aTileX, aTileY, bTileX, bTileY);
    }

    if (Math.abs(dx) === 1 && Math.abs(dy) === 1) {
      return (
        this.canTraverseTileEdge(aTileX, aTileY, aTileX + dx, aTileY) &&
        this.canTraverseTileEdge(aTileX + dx, aTileY, bTileX, bTileY)
      ) || (
        this.canTraverseTileEdge(aTileX, aTileY, aTileX, aTileY + dy) &&
        this.canTraverseTileEdge(aTileX, aTileY + dy, bTileX, bTileY)
      );
    }

    return false;
  }

  canMoveTo(worldX, worldY) {
    const tileX = this.worldToTileX(worldX);
    const tileY = this.worldToTileY(worldY);

    if (!this.walkableTiles.has(`${tileX},${tileY}`)) {
      return false;
    }

    const currentTileX = this.worldToTileX(this.player.x);
    const currentTileY = this.worldToTileY(this.player.y);

    if (currentTileX === tileX && currentTileY === tileY) {
      return true;
    }

    return this.canTraverseTileEdge(currentTileX, currentTileY, tileX, tileY);
  }

  canTraverseTileEdge(fromTileX, fromTileY, toTileX, toTileY) {
    if (!this.currentFloorData) {
      return false;
    }

    const manhattan = Math.abs(fromTileX - toTileX) +
      Math.abs(fromTileY - toTileY);
    if (manhattan !== 1) {
      return false;
    }

    const edgeKey = this.makeTileEdgeKey(
      fromTileX,
      fromTileY,
      toTileX,
      toTileY,
    );
    if (this.corridorWallEdges.has(edgeKey)) {
      return false;
    }

    const fromRoom = this.getRoomAtTile(
      this.currentFloorData,
      fromTileX,
      fromTileY,
    );
    const toRoom = this.getRoomAtTile(this.currentFloorData, toTileX, toTileY);

    if (fromRoom && toRoom) {
      if (fromRoom !== toRoom) {
        return false;
      }

      const openEdges = this.roomOpenEdges.get(fromRoom.id);
      if (!openEdges) {
        return false;
      }

      return this.isRoomEdgeOpen(
        openEdges,
        fromTileX - fromRoom.x,
        fromTileY - fromRoom.y,
        toTileX - fromRoom.x,
        toTileY - fromRoom.y,
      );
    }

    if (fromRoom && !toRoom) {
      return this.isRoomDoorTransition(
        fromRoom,
        fromTileX,
        fromTileY,
        toTileX,
        toTileY,
      );
    }

    if (!fromRoom && toRoom) {
      return this.isRoomDoorTransition(
        toRoom,
        toTileX,
        toTileY,
        fromTileX,
        fromTileY,
      );
    }

    return true;
  }

  isRoomDoorTransition(room, roomTileX, roomTileY, outsideTileX, outsideTileY) {
    const slots = room.edgeDoorSlots;
    if (!slots) {
      return false;
    }

    if (outsideTileX < room.x && roomTileX === room.x) {
      return slots.left?.includes(roomTileY - room.y);
    }
    if (
      outsideTileX >= room.x + room.w &&
      roomTileX === room.x + room.w - 1
    ) {
      return slots.right?.includes(roomTileY - room.y);
    }
    if (outsideTileY < room.y && roomTileY === room.y) {
      return slots.top?.includes(roomTileX - room.x);
    }
    if (
      outsideTileY >= room.y + room.h &&
      roomTileY === room.y + room.h - 1
    ) {
      return slots.bottom?.includes(roomTileX - room.x);
    }

    return false;
  }

  isRoomEdgeOpen(openEdges, ax, ay, bx, by) {
    const a = `${ax},${ay}`;
    const b = `${bx},${by}`;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    return openEdges.has(key);
  }

  getRoomAtTile(floor, tileX, tileY) {
    for (const room of floor.rooms) {
      if (
        tileX >= room.x &&
        tileX < room.x + room.w &&
        tileY >= room.y &&
        tileY < room.y + room.h
      ) {
        return room;
      }
    }

    return null;
  }

  checkStairs() {
    const found = this.findNearestStairInRange();

    if (found) {
      this.nearStair = found;
      const stairPromptText = `Press E to go ${
        found.dir === 'up' ? 'UP' : 'DOWN'
      }`;
      if (!this.stairPrompt) {
        this.stairPrompt = this.add.text(
          this.player.x,
          this.player.y - 30,
          stairPromptText,
          {
            fontSize: '10px',
            fill: '#ff0',
            backgroundColor: '#000',
            padding: { x: 4, y: 2 },
          },
        );
        this.stairPrompt.setOrigin(0.5);
        this.stairPrompt.setDepth(1100);
      } else {
        this.stairPrompt.setText(stairPromptText);
        this.stairPrompt.setPosition(this.player.x, this.player.y - 30);
      }
    } else {
      this.nearStair = null;
      if (this.stairPrompt) {
        this.stairPrompt.destroy();
        this.stairPrompt = null;
      }
    }
  }

  useStairs(stair) {
    this.lastStairDir = stair.dir;
    this.loadFloor(stair.toFloor);

    if (this.stairPrompt) {
      this.stairPrompt.destroy();
      this.stairPrompt = null;
    }
  }

  checkLootboxes() {
    let closest = null;
    let closestDist = Infinity;

    this.lootboxes.forEach((box) => {
      if (box.opened || !box.visible) return;
      const dx = this.player.x - box.x;
      const dy = this.player.y - box.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.interactionRadius && dist < closestDist) {
        closest = box;
        closestDist = dist;
      }
    });

    if (closest) {
      this.nearLootbox = closest;
      if (!this.lootboxPrompt) {
        this.lootboxPrompt = this.add.text(
          this.player.x,
          this.player.y - 30,
          'Press E to open',
          {
            fontSize: '10px',
            fill: '#ff0',
            backgroundColor: '#000',
            padding: { x: 4, y: 2 },
          },
        );
        this.lootboxPrompt.setOrigin(0.5);
        this.lootboxPrompt.setDepth(1100);
      } else {
        this.lootboxPrompt.setPosition(this.player.x, this.player.y - 30);
      }
    } else {
      this.nearLootbox = null;
      if (this.lootboxPrompt) {
        this.lootboxPrompt.destroy();
        this.lootboxPrompt = null;
      }
    }
  }

  checkExit() {
    const endRoom = this.currentFloorData.rooms.find((room) => room.isEnd);

    if (endRoom && endRoom.endPos) {
      const dist = this.distanceToTileCenter(
        endRoom.endPos.x,
        endRoom.endPos.y,
      );

      if (dist < this.interactionRadius) {
        this.nearExit = true;
        if (!this.exitPrompt) {
          this.exitPrompt = this.add.text(
            this.player.x,
            this.player.y - 30,
            'Press E to exit',
            {
              fontSize: '10px',
              fill: '#0ff',
              backgroundColor: '#000',
              padding: { x: 4, y: 2 },
            },
          );
          this.exitPrompt.setOrigin(0.5);
          this.exitPrompt.setDepth(1100);
        } else {
          this.exitPrompt.setPosition(this.player.x, this.player.y - 30);
        }
        return;
      }
    }

    this.nearExit = false;
    if (this.exitPrompt) {
      this.exitPrompt.destroy();
      this.exitPrompt = null;
    }
  }

  checkEntrance() {
    if (this.currentFloor !== 0) {
      this.nearEntrance = false;
      if (this.entrancePrompt) {
        this.entrancePrompt.destroy();
        this.entrancePrompt = null;
      }
      return;
    }

    const startRoom = this.currentFloorData.rooms.find((room) => room.isStart);
    if (startRoom && startRoom.startPos) {
      const dist = this.distanceToTileCenter(
        startRoom.startPos.x,
        startRoom.startPos.y,
      );

      if (dist < this.interactionRadius) {
        this.nearEntrance = true;
        if (!this.entrancePrompt) {
          this.entrancePrompt = this.add.text(
            this.player.x,
            this.player.y - 30,
            'Press Q to leave',
            {
              fontSize: '10px',
              fill: '#0f0',
              backgroundColor: '#000',
              padding: { x: 4, y: 2 },
            },
          );
          this.entrancePrompt.setOrigin(0.5);
          this.entrancePrompt.setDepth(1100);
        } else {
          this.entrancePrompt.setPosition(this.player.x, this.player.y - 30);
        }
        return;
      }
    }

    this.nearEntrance = false;
    if (this.entrancePrompt) {
      this.entrancePrompt.destroy();
      this.entrancePrompt = null;
    }
  }

  destroyDecorTexts() {
    this.decorTexts.forEach((text) => text.destroy());
    this.decorTexts = [];
  }

  findNearestStairInRange() {
    let nearestStair = null;
    let nearestDistance = Infinity;

    this.currentFloorData.stairs.forEach((stair) => {
      const dist = this.distanceToTileCenter(stair.x, stair.y);
      if (dist < this.interactionRadius && dist < nearestDistance) {
        nearestStair = stair;
        nearestDistance = dist;
      }
    });

    return nearestStair;
  }

  distanceToTileCenter(tileX, tileY) {
    return Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.worldToWorldX(tileX) + this.tileSize / 2,
      this.worldToWorldY(tileY) + this.tileSize / 2,
    );
  }

  destroyEnemies() {
    this.monsterController?.destroy();
    this.enemies = this.monsterController?.enemies || [];
  }

  destroyLootboxes() {
    this.lootboxes.forEach((lootbox) => lootbox.destroy());
    this.lootboxes = [];
  }

  resetForFreshDungeonRun() {
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    if (this.stairPrompt) {
      this.stairPrompt.destroy();
      this.stairPrompt = null;
    }
    if (this.exitPrompt) {
      this.exitPrompt.destroy();
      this.exitPrompt = null;
    }
    if (this.entrancePrompt) {
      this.entrancePrompt.destroy();
      this.entrancePrompt = null;
    }
    if (this.floorText) {
      this.floorText.destroy();
      this.floorText = null;
    }
    if (this.currentRoomText) {
      this.currentRoomText.destroy();
      this.currentRoomText = null;
    }
    if (this.exploredOverlay) {
      this.exploredOverlay.destroy();
      this.exploredOverlay = null;
    }
    if (this.lanternGlow) {
      this.lanternGlow.destroy();
      this.lanternGlow = null;
    }

    if (this.textures.exists(this.lanternMaskKey)) {
      this.textures.remove(this.lanternMaskKey);
    }
    if (this.textures.exists(this.exploredMaskKey)) {
      this.textures.remove(this.exploredMaskKey);
    }

    this.destroyDecorTexts();
    this.destroyEnemies();
    this.destroyLootboxes();
    this.monsterController = null;
    this.walkableTiles.clear();
    this.corridorWallEdges.clear();
    this.roomOpenEdges.clear();
    this.activatedRooms.clear();
    this.currentRoom = null;
    this.lastStairDir = null;
    this.nearStair = null;
    this.nearExit = false;
    this.nearEntrance = false;
    this.monstersAlerted = false;
  }

  worldToWorldX(tileX) {
    return this.worldOffset.x + tileX * this.tileSize;
  }

  worldToWorldY(tileY) {
    return this.worldOffset.y + tileY * this.tileSize;
  }

  worldToTileX(worldX) {
    return Math.floor((worldX - this.worldOffset.x) / this.tileSize);
  }

  worldToTileY(worldY) {
    return Math.floor((worldY - this.worldOffset.y) / this.tileSize);
  }
}

globalThis.Dungeons = Dungeons;
