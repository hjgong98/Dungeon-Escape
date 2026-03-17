// Monsters.js
// Provides a simple Monster prefab and a DungeonMonsterController used by
// Dungeons scene for spawn/update/pathing behavior.

class Monster extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, scene.enemySpriteKey, 0);
    scene.add.existing(this);
    this.setDisplaySize(scene.enemyDisplaySize, scene.enemyDisplaySize);
  }
}

class DungeonMonsterController {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.enemies = [];
    this.wanderSpeed = options.wanderSpeed ?? 0.35;
    this.chaseSpeed = options.chaseSpeed ?? 0.6;
    this.globalAggro = Boolean(options.globalAggro);
  }

  createEnemyCombatStats(playerProfile = {}, floor = {}) {
    const safeLevel = Math.max(1, Number(playerProfile.level) || 1);
    const floorDepth = Math.max(
      1,
      Number(floor.floorDepth ?? floor.index + 1) || 1,
    );

    // Keep floor scaling multipliers while adding explicit per-level base growth
    // so both HP and ATK increase noticeably as player level rises.
    const levelHpBaseBonus = (safeLevel - 1) * 8;
    const levelAtkBaseBonus = (safeLevel - 1) * 0.6;
    const floorHpMultiplier = 1 + (floorDepth - 1) * 0.35;
    const floorAtkMultiplier = 1 + (floorDepth - 1) * 0.22;
    const baseMaxHp = Math.max(
      1,
      Math.round((80 + levelHpBaseBonus) * floorHpMultiplier),
    );

    return {
      level: safeLevel + floorDepth - 1,
      maxHp: baseMaxHp,
      hp: baseMaxHp,
      atk: Math.max(
        1,
        Math.round((4 + levelAtkBaseBonus) * floorAtkMultiplier),
      ),
    };
  }

  setGlobalAggro(enabled) {
    this.globalAggro = Boolean(enabled);
    this.enemies.forEach((enemy) => {
      enemy.path = [];
      enemy.pathTargetKey = null;
    });
  }

  createForFloor(floor) {
    this.destroy();
    const playerProfile = this.scene.getPlayerCombatProfile();

    floor.rooms.forEach((room) => {
      (room.enemies || []).forEach((enemyData, index) => {
        const variants = globalThis.MONSTER_VARIANTS || [];
        const variant = variants.length > 0
          ? variants[Math.floor(Math.random() * variants.length)]
          : null;
        const walkSpriteKey = variant
          ? `enemy-${variant.id}-walk`
          : this.scene.enemySpriteKey;
        const hurtSpriteKey = variant
          ? `enemy-${variant.id}-hurt`
          : this.scene.enemyHurtSpriteKey;
        const deathSpriteKey = variant
          ? `enemy-${variant.id}-death`
          : this.scene.enemyDeathSpriteKey;
        const dirs = ['down', 'up', 'left', 'right'];
        const walkAnimKeys = Object.fromEntries(
          dirs.map((d) => [d, `${walkSpriteKey}-${d}`]),
        );
        const hurtAnimKeys = Object.fromEntries(
          dirs.map((d) => [d, `${hurtSpriteKey}-${d}`]),
        );
        const deathAnimKeys = Object.fromEntries(
          dirs.map((d) => [d, `${deathSpriteKey}-${d}`]),
        );

        const sprite = new Monster(
          this.scene,
          this.scene.worldToWorldX(enemyData.x) + this.scene.tileSize / 2,
          this.scene.worldToWorldY(enemyData.y) + this.scene.tileSize / 2,
        );
        const displayScale = variant?.displayScale ?? 1.0;
        const displaySize = this.scene.enemyDisplaySize * displayScale;
        sprite.setDisplaySize(displaySize, displaySize);
        sprite.setTexture(walkSpriteKey, 0);
        sprite.setDepth(19);

        const combatStats = this.createEnemyCombatStats(playerProfile, floor);

        this.enemies.push({
          id: enemyData.id || `${room.id}-enemy-${index}`,
          roomId: room.id,
          sprite,
          facing: 'down',
          walkSpriteKey,
          hurtSpriteKey,
          deathSpriteKey,
          walkAnimKeys,
          hurtAnimKeys,
          deathAnimKeys,
          hurtLockUntil: 0,
          homeTileX: enemyData.x,
          homeTileY: enemyData.y,
          wanderTargetTile: { x: enemyData.x, y: enemyData.y },
          path: [],
          pathTargetKey: null,
          level: combatStats.level,
          hp: combatStats.hp,
          maxHp: combatStats.maxHp,
          atk: combatStats.atk,
          isDying: false,
          isCollidingWithPlayer: false,
          nextContactTime: 0,
        });
      });
    });

    this.scene.enemies = this.enemies;
  }

  update(floor) {
    if (!floor || !this.scene.player) {
      return;
    }

    this.enemies.forEach((enemy) => {
      if (enemy.isDying || !enemy?.sprite?.visible) {
        return;
      }

      const room = floor.rooms.find((candidate) =>
        candidate.id === enemy.roomId
      );
      if (!room) {
        return;
      }

      const enemyTileX = this.scene.worldToTileX(enemy.sprite.x);
      const enemyTileY = this.scene.worldToTileY(enemy.sprite.y);

      if (this.globalAggro) {
        const targetTile = {
          x: this.scene.worldToTileX(this.scene.player.x),
          y: this.scene.worldToTileY(this.scene.player.y),
        };
        this.moveEnemyTowardTileAcrossMap(enemy, targetTile, this.chaseSpeed);
        return;
      }

      let targetTile = enemy.wanderTargetTile;
      if (!targetTile) {
        targetTile = { x: enemy.homeTileX, y: enemy.homeTileY };
        enemy.wanderTargetTile = targetTile;
      }

      const reachedWanderTarget = enemyTileX === enemy.wanderTargetTile.x &&
        enemyTileY === enemy.wanderTargetTile.y;

      if (reachedWanderTarget) {
        enemy.wanderTargetTile = this.pickEnemyWanderTile(room, enemy);
      }

      targetTile = enemy.wanderTargetTile;

      this.moveEnemyTowardTileWithinRoom(
        enemy,
        room,
        targetTile,
        this.wanderSpeed,
      );
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

    const currentTileX = this.scene.worldToTileX(enemy.sprite.x);
    const currentTileY = this.scene.worldToTileY(enemy.sprite.y);
    const pool = candidates.filter((tile) =>
      tile.x !== currentTileX || tile.y !== currentTileY
    );

    return Phaser.Utils.Array.GetRandom(pool.length > 0 ? pool : candidates);
  }

  moveEnemyTowardTileWithinRoom(enemy, room, targetTile, speed) {
    const startTile = {
      x: this.scene.worldToTileX(enemy.sprite.x),
      y: this.scene.worldToTileY(enemy.sprite.y),
    };
    const targetKey = `wander:${targetTile.x},${targetTile.y}`;

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
      this.updateEnemyVisual(enemy, 0, 0);
      return;
    }

    const nextTile = enemy.path[0];
    const targetX = this.scene.worldToWorldX(nextTile.x) +
      this.scene.tileSize / 2;
    const targetY = this.scene.worldToWorldY(nextTile.y) +
      this.scene.tileSize / 2;
    const dx = targetX - enemy.sprite.x;
    const dy = targetY - enemy.sprite.y;
    this.updateEnemyVisual(enemy, dx, dy);
    const distance = Math.hypot(dx, dy);

    if (distance <= speed) {
      this.scene.moveEnemyWithCollisions(enemy, targetX, targetY);
      enemy.path.shift();
      return;
    }

    this.scene.moveEnemyWithCollisions(
      enemy,
      enemy.sprite.x + (dx / distance) * speed,
      enemy.sprite.y + (dy / distance) * speed,
    );
  }

  moveEnemyTowardTileAcrossMap(enemy, targetTile, speed) {
    const startTile = {
      x: this.scene.worldToTileX(enemy.sprite.x),
      y: this.scene.worldToTileY(enemy.sprite.y),
    };
    const targetKey = `aggro:${targetTile.x},${targetTile.y}`;

    if (
      enemy.path.length === 0 ||
      enemy.pathTargetKey !== targetKey ||
      enemy.path[enemy.path.length - 1]?.x !== targetTile.x ||
      enemy.path[enemy.path.length - 1]?.y !== targetTile.y
    ) {
      enemy.path = this.findPathAcrossMap(startTile, targetTile);
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
      this.updateEnemyVisual(enemy, 0, 0);
      return;
    }

    const nextTile = enemy.path[0];
    const targetX = this.scene.worldToWorldX(nextTile.x) +
      this.scene.tileSize / 2;
    const targetY = this.scene.worldToWorldY(nextTile.y) +
      this.scene.tileSize / 2;
    const dx = targetX - enemy.sprite.x;
    const dy = targetY - enemy.sprite.y;
    this.updateEnemyVisual(enemy, dx, dy);
    const distance = Math.hypot(dx, dy);

    if (distance <= speed) {
      this.scene.moveEnemyWithCollisions(enemy, targetX, targetY);
      enemy.path.shift();
      return;
    }

    this.scene.moveEnemyWithCollisions(
      enemy,
      enemy.sprite.x + (dx / distance) * speed,
      enemy.sprite.y + (dy / distance) * speed,
    );
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

  findPathAcrossMap(startTile, goalTile) {
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

      this.getMapNeighbors(current).forEach((neighbor) => {
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
    const openEdges = this.scene.roomOpenEdges.get(room.id) ||
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
        !this.scene.isRoomEdgeOpen(
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

  getMapNeighbors(tile) {
    const neighbors = [];
    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    directions.forEach((direction) => {
      const nextTileX = tile.x + direction.dx;
      const nextTileY = tile.y + direction.dy;

      if (!this.scene.walkableTiles.has(`${nextTileX},${nextTileY}`)) {
        return;
      }

      if (
        !this.scene.canTraverseTileEdge(tile.x, tile.y, nextTileX, nextTileY)
      ) {
        return;
      }

      neighbors.push({ x: nextTileX, y: nextTileY });
    });

    return neighbors;
  }

  updateEnemyVisual(enemy, dx, dy) {
    if (!enemy?.sprite?.anims) {
      return;
    }

    if (enemy.isDying) {
      const deathSpriteKey = enemy.deathSpriteKey ||
        this.scene.enemyDeathSpriteKey;
      const deathAnimKeys = enemy.deathAnimKeys ||
        this.scene.enemyDeathAnimKeys;
      if (enemy.sprite.texture.key !== deathSpriteKey) {
        enemy.sprite.setTexture(deathSpriteKey, 0);
      }
      const deathAnimKey = deathAnimKeys[enemy.facing] || deathAnimKeys.down;
      if (
        enemy.sprite.anims.currentAnim?.key !== deathAnimKey ||
        !enemy.sprite.anims.isPlaying
      ) {
        enemy.sprite.play(deathAnimKey);
      }
      return;
    }

    if (Math.abs(dy) > Math.abs(dx)) {
      enemy.facing = dy < 0 ? 'up' : 'down';
    } else if (Math.abs(dx) > 0) {
      enemy.facing = dx < 0 ? 'left' : 'right';
    }

    if ((this.scene.time?.now || 0) < (enemy.hurtLockUntil || 0)) {
      const hurtSpriteKey = enemy.hurtSpriteKey ||
        this.scene.enemyHurtSpriteKey;
      const hurtAnimKeys = enemy.hurtAnimKeys || this.scene.enemyHurtAnimKeys;
      if (enemy.sprite.texture.key !== hurtSpriteKey) {
        enemy.sprite.setTexture(hurtSpriteKey, 0);
      }
      const hurtAnimKey = hurtAnimKeys[enemy.facing] || hurtAnimKeys.down;
      if (
        enemy.sprite.anims.currentAnim?.key !== hurtAnimKey ||
        !enemy.sprite.anims.isPlaying
      ) {
        enemy.sprite.play(hurtAnimKey);
      }
      return;
    }

    const walkSpriteKey = enemy.walkSpriteKey || this.scene.enemySpriteKey;
    const walkAnimKeys = enemy.walkAnimKeys || this.scene.enemyWalkAnimKeys;

    if (dx === 0 && dy === 0) {
      enemy.sprite.anims.stop();
      if (enemy.sprite.texture.key !== walkSpriteKey) {
        enemy.sprite.setTexture(walkSpriteKey, 0);
      }
      enemy.sprite.setFrame(this.getEnemyIdleFrame(enemy.facing));
      return;
    }

    if (enemy.sprite.texture.key !== walkSpriteKey) {
      enemy.sprite.setTexture(walkSpriteKey, 0);
    }
    const animKey = walkAnimKeys[enemy.facing] || walkAnimKeys.down;
    if (
      enemy.sprite.anims.currentAnim?.key !== animKey ||
      !enemy.sprite.anims.isPlaying
    ) {
      enemy.sprite.play(animKey);
    }
  }

  getEnemyIdleFrame(direction) {
    const idleFrames = {
      down: 0,
      up: 8,
      left: 16,
      right: 24,
    };

    return idleFrames[direction] ?? 0;
  }

  destroy() {
    this.enemies.forEach((enemy) => enemy.sprite.destroy());
    this.enemies = [];
    this.scene.enemies = this.enemies;
  }
}

globalThis.Monster = Monster;
globalThis.DungeonMonsterController = DungeonMonsterController;
