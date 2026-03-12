class Dungeons extends Phaser.Scene {
  constructor() {
    super('Dungeons');

    this.player = null;
    this.playerSpeed = 1.5;
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
    this.enemyWanderSpeed = 0.35;
    this.enemyChaseSpeed = 0.6;
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
  }

  create() {
    this.resetForFreshDungeonRun();
    this.ensureLanternMaskTexture();

    this.dungeon = generateDungeon();

    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      q: Phaser.Input.Keyboard.KeyCodes.Q,
    });

    this.loadFloor(0);

    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(4);
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

    this.calculateBounds(floor);
    this.drawFloor(floor);
    this.buildWalkableTiles(floor);
    this.buildCorridorWallEdges(floor);

    this.roomOpenEdges.clear();
    floor.rooms.forEach((room) => {
      this.roomOpenEdges.set(room.id, new Set(room.openEdges || []));
    });

    this.createEnemiesForFloor(floor);
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

    floor.rooms.forEach((room) => {
      this.graphics.lineStyle(3, 0x888888, 1);
      this.graphics.strokeRect(
        this.worldToWorldX(room.x),
        this.worldToWorldY(room.y),
        room.w * size,
        room.h * size,
      );

      for (let y = 0; y < room.h; y++) {
        for (let x = 0; x < room.w; x++) {
          const tile = room.maze[y][x];
          const worldX = this.worldToWorldX(room.x + x);
          const worldY = this.worldToWorldY(room.y + y);

          if (tile.type === 'floor') {
            this.graphics.fillStyle(0x444444, 1);
          } else {
            this.graphics.fillStyle(0x222222, 1);
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
      this.graphics.lineStyle(3, 0x111111, 1);

      for (let y = 0; y < room.h; y++) {
        for (let x = 0; x < room.w; x++) {
          if (room.maze[y][x].type !== 'floor') {
            continue;
          }

          if (x + 1 < room.w && room.maze[y][x + 1]?.type === 'floor') {
            if (!this.isRoomEdgeOpen(openEdges, x, y, x + 1, y)) {
              const wx = this.worldToWorldX(room.x + x + 1);
              const wy = this.worldToWorldY(room.y + y);
              this.graphics.lineBetween(wx, wy, wx, wy + size);
            }
          }

          if (y + 1 < room.h && room.maze[y + 1][x]?.type === 'floor') {
            if (!this.isRoomEdgeOpen(openEdges, x, y, x, y + 1)) {
              const wx = this.worldToWorldX(room.x + x);
              const wy = this.worldToWorldY(room.y + y + 1);
              this.graphics.lineBetween(wx, wy, wx + size, wy);
            }
          }
        }
      }
    });

    floor.corridorTiles.forEach((tile) => {
      const wx = this.worldToWorldX(tile.x);
      const wy = this.worldToWorldY(tile.y);
      this.graphics.fillStyle(0x555555, 1);
      this.graphics.fillRect(wx, wy, size - 1, size - 1);
    });

    floor.corridorWalls?.forEach((wall) => {
      this.graphics.lineStyle(3, 0x111111, 1);
      if (wall.y1 === wall.y2) {
        // Horizontally adjacent tiles — draw a vertical wall at the shared x edge
        const edgeX = this.worldToWorldX(Math.max(wall.x1, wall.x2));
        const edgeY = this.worldToWorldY(wall.y1);
        this.graphics.lineBetween(edgeX, edgeY, edgeX, edgeY + size);
      } else {
        // Vertically adjacent tiles — draw a horizontal wall at the shared y edge
        const edgeX = this.worldToWorldX(wall.x1);
        const edgeY = this.worldToWorldY(Math.max(wall.y1, wall.y2));
        this.graphics.lineBetween(edgeX, edgeY, edgeX + size, edgeY);
      }
    });

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
          fontSize: '12px',
          fill: '#0ff',
          backgroundColor: '#000',
          padding: { x: 3, y: 2 },
        },
      );
      exitText.setOrigin(0.5);
      this.decorTexts.push(exitText);
    }
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

      this.player = this.add.circle(
        this.worldToWorldX(spawnTile.x) + this.tileSize / 2,
        this.worldToWorldY(spawnTile.y) + this.tileSize / 2,
        8,
        0x00ff00,
      );
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

    this.player.setDepth(1002);
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
    this.enemies = [];

    floor.rooms.forEach((room) => {
      (room.enemies || []).forEach((enemyData, index) => {
        const sprite = this.add.circle(
          this.worldToWorldX(enemyData.x) + this.tileSize / 2,
          this.worldToWorldY(enemyData.y) + this.tileSize / 2,
          7,
          0xb84dff,
        );
        sprite.setDepth(19);

        this.enemies.push({
          id: enemyData.id || `${room.id}-enemy-${index}`,
          roomId: room.id,
          sprite,
          homeTileX: enemyData.x,
          homeTileY: enemyData.y,
          wanderTargetTile: { x: enemyData.x, y: enemyData.y },
          path: [],
          pathTargetKey: null,
        });
      });
    });
  }

  updateEnemies(floor) {
    this.enemies.forEach((enemy) => {
      const room = floor.rooms.find((candidate) =>
        candidate.id === enemy.roomId
      );
      if (!room) {
        return;
      }

      if (!this.activatedRooms.has(room.id)) {
        enemy.sprite.setPosition(
          this.worldToWorldX(enemy.homeTileX) + this.tileSize / 2,
          this.worldToWorldY(enemy.homeTileY) + this.tileSize / 2,
        );
        enemy.path = [];
        enemy.pathTargetKey = null;
        enemy.wanderTargetTile = { x: enemy.homeTileX, y: enemy.homeTileY };
        return;
      }

      const enemyTileX = this.worldToTileX(enemy.sprite.x);
      const enemyTileY = this.worldToTileY(enemy.sprite.y);
      let targetTile = null;
      let speed = this.enemyWanderSpeed;

      if (this.currentRoom?.id === room.id) {
        const distance = Phaser.Math.Distance.Between(
          enemy.sprite.x,
          enemy.sprite.y,
          this.player.x,
          this.player.y,
        );

        if (distance <= this.enemyDetectionRange) {
          targetTile = {
            x: this.worldToTileX(this.player.x),
            y: this.worldToTileY(this.player.y),
          };
          speed = this.enemyChaseSpeed;
        }
      }

      if (!targetTile) {
        const reachedWanderTarget = enemyTileX === enemy.wanderTargetTile.x &&
          enemyTileY === enemy.wanderTargetTile.y;

        if (reachedWanderTarget) {
          enemy.wanderTargetTile = this.pickEnemyWanderTile(room, enemy);
        }

        targetTile = enemy.wanderTargetTile;
      }

      this.moveEnemyTowardTileWithAStar(enemy, room, targetTile, speed);
    });
  }

  pickEnemyWanderTile(room, enemy) {
    const candidates = [];

    for (let y = 0; y < room.h; y++) {
      for (let x = 0; x < room.w; x++) {
        if (room.maze[y][x].type === 'floor') {
          candidates.push({ x: room.x + x, y: room.y + y });
        }
      }
    }

    if (candidates.length === 0) {
      return { x: enemy.homeTileX, y: enemy.homeTileY };
    }

    const currentTileX = this.worldToTileX(enemy.sprite.x);
    const currentTileY = this.worldToTileY(enemy.sprite.y);
    const pool = candidates.filter((tile) =>
      tile.x !== currentTileX || tile.y !== currentTileY
    );

    return Phaser.Utils.Array.GetRandom(pool.length > 0 ? pool : candidates);
  }

  moveEnemyTowardTileWithAStar(enemy, room, targetTile, speed) {
    const startTile = {
      x: this.worldToTileX(enemy.sprite.x),
      y: this.worldToTileY(enemy.sprite.y),
    };
    const targetKey = `${targetTile.x},${targetTile.y}`;

    if (
      enemy.path.length === 0 ||
      enemy.pathTargetKey !== targetKey ||
      enemy.path[enemy.path.length - 1]?.x !== targetTile.x ||
      enemy.path[enemy.path.length - 1]?.y !== targetTile.y
    ) {
      enemy.path = this.findPathWithinRoom(room, startTile, targetTile);
      enemy.pathTargetKey = targetKey;
    }

    while (
      enemy.path.length > 0 &&
      enemy.path[0].x === startTile.x &&
      enemy.path[0].y === startTile.y
    ) {
      enemy.path.shift();
    }

    if (enemy.path.length === 0) {
      return;
    }

    const nextTile = enemy.path[0];
    const targetX = this.worldToWorldX(nextTile.x) + this.tileSize / 2;
    const targetY = this.worldToWorldY(nextTile.y) + this.tileSize / 2;
    const dx = targetX - enemy.sprite.x;
    const dy = targetY - enemy.sprite.y;
    const distance = Math.hypot(dx, dy);

    if (distance <= speed) {
      enemy.sprite.setPosition(targetX, targetY);
      enemy.path.shift();
      return;
    }

    enemy.sprite.x += (dx / distance) * speed;
    enemy.sprite.y += (dy / distance) * speed;
  }

  findPathWithinRoom(room, startTile, goalTile) {
    if (startTile.x === goalTile.x && startTile.y === goalTile.y) {
      return [];
    }

    const openSet = [startTile];
    const openKeys = new Set([`${startTile.x},${startTile.y}`]);
    const cameFrom = new Map();
    const gScore = new Map([[`${startTile.x},${startTile.y}`, 0]]);
    const fScore = new Map([[
      `${startTile.x},${startTile.y}`,
      this.heuristicCost(startTile, goalTile),
    ]]);

    while (openSet.length > 0) {
      openSet.sort((a, b) =>
        (fScore.get(`${a.x},${a.y}`) ?? Infinity) -
        (fScore.get(`${b.x},${b.y}`) ?? Infinity)
      );

      const current = openSet.shift();
      const currentKey = `${current.x},${current.y}`;
      openKeys.delete(currentKey);

      if (current.x === goalTile.x && current.y === goalTile.y) {
        return this.reconstructTilePath(cameFrom, current);
      }

      this.getRoomNeighbors(room, current).forEach((neighbor) => {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        const tentativeG = (gScore.get(currentKey) ?? Infinity) + 1;

        if (tentativeG >= (gScore.get(neighborKey) ?? Infinity)) {
          return;
        }

        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeG);
        fScore.set(
          neighborKey,
          tentativeG + this.heuristicCost(neighbor, goalTile),
        );

        if (!openKeys.has(neighborKey)) {
          openSet.push(neighbor);
          openKeys.add(neighborKey);
        }
      });
    }

    return [];
  }

  reconstructTilePath(cameFrom, current) {
    const path = [current];
    let currentKey = `${current.x},${current.y}`;

    while (cameFrom.has(currentKey)) {
      const previous = cameFrom.get(currentKey);
      path.unshift(previous);
      currentKey = `${previous.x},${previous.y}`;
    }

    return path;
  }

  heuristicCost(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  getRoomNeighbors(room, tile) {
    const neighbors = [];
    const localX = tile.x - room.x;
    const localY = tile.y - room.y;
    const openEdges = this.roomOpenEdges.get(room.id) ||
      new Set(room.openEdges || []);
    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    directions.forEach((direction) => {
      const nextLocalX = localX + direction.dx;
      const nextLocalY = localY + direction.dy;

      if (
        nextLocalX < 0 ||
        nextLocalX >= room.w ||
        nextLocalY < 0 ||
        nextLocalY >= room.h
      ) {
        return;
      }

      if (room.maze[nextLocalY][nextLocalX]?.type !== 'floor') {
        return;
      }

      if (
        !this.isRoomEdgeOpen(
          openEdges,
          localX,
          localY,
          nextLocalX,
          nextLocalY,
        )
      ) {
        return;
      }

      neighbors.push({
        x: room.x + nextLocalX,
        y: room.y + nextLocalY,
      });
    });

    return neighbors;
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

      if (this.canMoveTo(newX, newY)) {
        this.player.x = newX;
        this.player.y = newY;
      } else {
        if (this.canMoveTo(newX, this.player.y)) {
          this.player.x = newX;
        }
        if (this.canMoveTo(this.player.x, newY)) {
          this.player.y = newY;
        }
      }
    }

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
    this.updateCurrentRoom();
    this.updateEnemies(this.currentFloorData);

    if (Phaser.Input.Keyboard.JustDown(this.keys.e)) {
      if (this.nearExit) {
        this.scene.start('Play');
      } else if (this.nearStair) {
        this.useStairs(this.nearStair);
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.q) && this.nearEntrance) {
      this.scene.start('Play');
    }

    this.syncLantern();
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

    const manhattan = Math.abs(currentTileX - tileX) +
      Math.abs(currentTileY - tileY);
    if (manhattan === 1) {
      const edgeKey = this.makeTileEdgeKey(
        currentTileX,
        currentTileY,
        tileX,
        tileY,
      );
      if (this.corridorWallEdges.has(edgeKey)) {
        return false;
      }
    }

    const fromRoom = this.getRoomAtTile(
      this.currentFloorData,
      currentTileX,
      currentTileY,
    );
    const toRoom = this.getRoomAtTile(this.currentFloorData, tileX, tileY);

    if (!fromRoom || !toRoom || fromRoom !== toRoom) {
      return true;
    }

    const openEdges = this.roomOpenEdges.get(fromRoom.id);
    if (!openEdges) {
      return false;
    }

    return this.isRoomEdgeOpen(
      openEdges,
      currentTileX - fromRoom.x,
      currentTileY - fromRoom.y,
      tileX - fromRoom.x,
      tileY - fromRoom.y,
    );
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
    let found = null;

    this.currentFloorData.stairs.forEach((stair) => {
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.worldToWorldX(stair.x) + this.tileSize / 2,
        this.worldToWorldY(stair.y) + this.tileSize / 2,
      );

      if (dist < 8) {
        found = stair;
      }
    });

    if (found) {
      this.nearStair = found;
      if (!this.stairPrompt) {
        this.stairPrompt = this.add.text(
          this.player.x,
          this.player.y - 30,
          `Press E to go ${found.dir === 'up' ? 'UP' : 'DOWN'}`,
          {
            fontSize: '14px',
            fill: '#ff0',
            backgroundColor: '#000',
            padding: { x: 4, y: 2 },
          },
        );
        this.stairPrompt.setOrigin(0.5);
        this.stairPrompt.setDepth(1100);
      } else {
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

  checkExit() {
    const endRoom = this.currentFloorData.rooms.find((room) => room.isEnd);

    if (endRoom && endRoom.endPos) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.worldToWorldX(endRoom.endPos.x) + this.tileSize / 2,
        this.worldToWorldY(endRoom.endPos.y) + this.tileSize / 2,
      );

      if (dist < 8) {
        this.nearExit = true;
        if (!this.exitPrompt) {
          this.exitPrompt = this.add.text(
            this.player.x,
            this.player.y - 30,
            'EXIT: \nPress E to leave',
            {
              fontSize: '14px',
              fill: '#0ff',
              backgroundColor: '#000',
              padding: { x: 6, y: 3 },
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
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.worldToWorldX(startRoom.startPos.x) + this.tileSize / 2,
        this.worldToWorldY(startRoom.startPos.y) + this.tileSize / 2,
      );

      if (dist < 8) {
        this.nearEntrance = true;
        if (!this.entrancePrompt) {
          this.entrancePrompt = this.add.text(
            this.player.x,
            this.player.y - 30,
            'ENTRANCE: \nPress Q to leave',
            {
              fontSize: '14px',
              fill: '#0f0',
              backgroundColor: '#000',
              padding: { x: 6, y: 3 },
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

  destroyEnemies() {
    this.enemies.forEach((enemy) => enemy.sprite.destroy());
    this.enemies = [];
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
    this.walkableTiles.clear();
    this.corridorWallEdges.clear();
    this.roomOpenEdges.clear();
    this.activatedRooms.clear();
    this.currentRoom = null;
    this.lastStairDir = null;
    this.nearStair = null;
    this.nearExit = false;
    this.nearEntrance = false;
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
