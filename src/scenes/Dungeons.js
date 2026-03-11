// dungeon.js
// TODO: Add item/monster spawning later

class Dungeons extends Phaser.Scene {
  constructor() {
    super('Dungeons');
    
    // Player stuff
    this.player = null;
    this.playerSpeed = 2;
    this.keys = {};
    
    // Dungeon stuff
    this.dungeon = null;
    this.currentFloor = 0;
    this.tileSize = 20;
    this.worldOffset = { x: 0, y: 0 };
    this.floorBounds = { minX: 0, minY: 0, width: 800, height: 600 };
    
    // Drawing
    this.graphics = null;
    this.stairPrompt = null;
    this.exitPrompt = null;
    this.entrancePrompt = null;
    this.decorTexts = [];
    
    // Fog of war / visibility
    this.visibleTiles = new Set();
    this.revealRadius = 3;
    this.fogGraphics = null;
    
    // Collision
    this.walkableTiles = new Set();
    this.currentFloorData = null;
    this.roomOpenEdges = new Map();
    
    // State
    this.nearStair = null;
    this.nearExit = false;
    this.nearEntrance = false;
    this.lastStairDir = null;
  }

  create() {
    // Clean up from previous runs
    if (this.player) this.player.destroy();
    if (this.graphics) this.graphics.destroy();
    if (this.fogGraphics) this.fogGraphics.destroy();
    this.decorTexts.forEach(t => t.destroy());
    this.decorTexts = [];
    this.visibleTiles.clear();
    
    // Generate new dungeon
    this.dungeon = generateDungeon();
    console.log('Dungeon generated:', this.dungeon);
    
    // Setup controls
    this.keys = this.input.keyboard.addKeys({
      'w': Phaser.Input.Keyboard.KeyCodes.W,
      'a': Phaser.Input.Keyboard.KeyCodes.A,
      's': Phaser.Input.Keyboard.KeyCodes.S,
      'd': Phaser.Input.Keyboard.KeyCodes.D,
      'e': Phaser.Input.Keyboard.KeyCodes.E,
      'q': Phaser.Input.Keyboard.KeyCodes.Q
    });

    // Load first floor
    this.loadFloor(0);
    
    // Camera follows player but zoomed in
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(4);
    
    // Add fog graphics layer
    this.fogGraphics = this.add.graphics();
    this.fogGraphics.setDepth(30);
  }

  loadFloor(floorNum) {
    this.currentFloor = floorNum;
    const floor = this.dungeon.floors[floorNum];
    this.currentFloorData = floor;
    
    // Reset state
    this.nearStair = null;
    this.nearExit = false;
    this.nearEntrance = false;
    
    // Clear old stuff
    if (this.graphics) this.graphics.clear();
    this.graphics = this.add.graphics();
    this.decorTexts.forEach(t => t.destroy());
    this.decorTexts = [];
    
    // Calculate where to draw everything
    this.calculateBounds(floor);
    
    // Draw the floor
    this.drawFloor(floor);
    
    // Build collision map
    this.buildWalkableTiles(floor);
    
    // Store open edges for each room
    this.roomOpenEdges.clear();
    floor.rooms.forEach(room => {
      if (room.openEdges) {
        const edgeSet = new Set(room.openEdges);
        this.roomOpenEdges.set(room.id, edgeSet);
      }
    });
    
    // Place player
    this.placePlayer(floor);
    
    // Set camera bounds
    this.cameras.main.setBounds(
      this.floorBounds.minX, this.floorBounds.minY,
      this.floorBounds.width, this.floorBounds.height
    );
    
    // Clear visible tiles for new floor
    this.visibleTiles.clear();
  }

  calculateBounds(floor) {
    // Find min/max tile coordinates
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    floor.rooms.forEach(room => {
      minX = Math.min(minX, room.x);
      minY = Math.min(minY, room.y);
      maxX = Math.max(maxX, room.x + room.w);
      maxY = Math.max(maxY, room.y + room.h);
    });
    
    floor.paths.forEach(path => {
      path.points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    });
    
    floor.stairs.forEach(s => {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x);
      maxY = Math.max(maxY, s.y);
    });
    
    // Center the view
    const contentWidth = (maxX - minX + 1) * this.tileSize;
    const contentHeight = (maxY - minY + 1) * this.tileSize;
    const viewportW = this.scale.width;
    const viewportH = this.scale.height;
    
    this.worldOffset.x = Math.floor((viewportW - contentWidth) / 2) - minX * this.tileSize;
    this.worldOffset.y = Math.floor((viewportH - contentHeight) / 2) - minY * this.tileSize;
    
    // Set bounds with padding
    const padding = 2 * this.tileSize;
    this.floorBounds = {
      minX: this.worldToWorldX(minX) - padding,
      minY: this.worldToWorldY(minY) - padding,
      width: this.worldToWorldX(maxX + 1) - this.worldToWorldX(minX) + padding * 2,
      height: this.worldToWorldY(maxY + 1) - this.worldToWorldY(minY) + padding * 2
    };
  }

  drawFloor(floor) {
    const size = this.tileSize;
    
    // Draw rooms
    floor.rooms.forEach(room => {
      // Draw room outline
      this.graphics.lineStyle(3, 0x888888);
      this.graphics.strokeRect(
        this.worldToWorldX(room.x),
        this.worldToWorldY(room.y),
        room.w * size,
        room.h * size
      );

      // Draw maze tiles
      for (let y = 0; y < room.h; y++) {
        for (let x = 0; x < room.w; x++) {
          const tile = room.maze[y][x];
          const worldX = this.worldToWorldX(room.x + x);
          const worldY = this.worldToWorldY(room.y + y);

          // Fill floor vs wall
          if (tile.type === 'floor') {
            this.graphics.fillStyle(0x444444, 1);
            this.graphics.fillRect(worldX, worldY, size - 1, size - 1);
          } else {
            this.graphics.fillStyle(0x222222, 1);
            this.graphics.fillRect(worldX, worldY, size - 1, size - 1);
          }

          // Items (yellow dots)
          if (tile.hasItem) {
            this.graphics.fillStyle(0xffff00, 1);
            this.graphics.fillCircle(worldX + size/2, worldY + size/2, 4);
          }

          // Enemies (red squares)
          if (tile.hasEnemy) {
            this.graphics.fillStyle(0xff0000, 1);
            this.graphics.fillRect(worldX + 5, worldY + 5, 10, 10);
          }
        }
      }

      // Draw wall edges between adjacent floor blocks that are NOT connected
      const openEdges = new Set(room.openEdges || []);
      this.graphics.lineStyle(3, 0x111111, 1);
      
      for (let y = 0; y < room.h; y++) {
        for (let x = 0; x < room.w; x++) {
          if (room.maze[y][x].type !== 'floor') continue;

          // Check right edge
          if (x + 1 < room.w && room.maze[y][x + 1]?.type === 'floor') {
            if (!this.isRoomEdgeOpen(openEdges, x, y, x + 1, y)) {
              const wx = this.worldToWorldX(room.x + x + 1);
              const wy = this.worldToWorldY(room.y + y);
              this.graphics.lineBetween(wx, wy, wx, wy + size);
            }
          }

          // Check bottom edge
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

    // Draw corridors
    floor.corridorTiles.forEach(tile => {
      const wx = this.worldToWorldX(tile.x);
      const wy = this.worldToWorldY(tile.y);
      this.graphics.fillStyle(0x555555, 1);
      this.graphics.fillRect(wx, wy, size - 1, size - 1);
    });

    // Draw walls between corridors
    floor.corridorWalls?.forEach(wall => {
      const wx1 = this.worldToWorldX(wall.x1) + size/2;
      const wy1 = this.worldToWorldY(wall.y1) + size/2;
      const wx2 = this.worldToWorldX(wall.x2) + size/2;
      const wy2 = this.worldToWorldY(wall.y2) + size/2;
      
      this.graphics.lineStyle(3, 0x111111, 1);
      this.graphics.lineBetween(wx1, wy1, wx2, wy2);
    });

    // Draw stairs
    floor.stairs.forEach(stair => {
      const sx = this.worldToWorldX(stair.x);
      const sy = this.worldToWorldY(stair.y);

      this.graphics.fillStyle(stair.dir === 'up' ? 0x00aa00 : 0xaa5500, 1);
      this.graphics.fillRect(sx, sy, size - 1, size - 1);

      const symbol = stair.dir === 'up' ? '▲' : '▼';
      const stairText = this.add.text(sx + size/2, sy + size/2, symbol, {
        fontSize: '16px',
        fill: '#fff'
      }).setOrigin(0.5);
      this.decorTexts.push(stairText);
    });

    // Draw exit symbol
    const endRoom = floor.rooms.find(r => r.isEnd);
    if (endRoom && endRoom.endPos) {
      const ex = this.worldToWorldX(endRoom.endPos.x) + size/2;
      const ey = this.worldToWorldY(endRoom.endPos.y) + size/2;
      const exitText = this.add.text(ex, ey, 'EXIT', {
        fontSize: '12px',
        fill: '#0ff',
        backgroundColor: '#000',
        padding: { x: 3, y: 2 }
      }).setOrigin(0.5);
      this.decorTexts.push(exitText);
    }
  }

  updateFog() {
    if (!this.player || !this.fogGraphics) return;
    
    const playerTileX = Math.floor((this.player.x - this.worldOffset.x) / this.tileSize);
    const playerTileY = Math.floor((this.player.y - this.worldOffset.y) / this.tileSize);
    
    for (let dy = -this.revealRadius; dy <= this.revealRadius; dy++) {
      for (let dx = -this.revealRadius; dx <= this.revealRadius; dx++) {
        const tileX = playerTileX + dx;
        const tileY = playerTileY + dy;
        this.visibleTiles.add(`${tileX},${tileY}`);
      }
    }
    
    this.fogGraphics.clear();
    this.fogGraphics.fillStyle(0x000000, 0.7);
    
    const minTileX = Math.floor((this.floorBounds.minX - this.worldOffset.x) / this.tileSize) - 5;
    const minTileY = Math.floor((this.floorBounds.minY - this.worldOffset.y) / this.tileSize) - 5;
    const maxTileX = Math.ceil((this.floorBounds.minX + this.floorBounds.width - this.worldOffset.x) / this.tileSize) + 5;
    const maxTileY = Math.ceil((this.floorBounds.minY + this.floorBounds.height - this.worldOffset.y) / this.tileSize) + 5;
    
    for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
        const key = `${tileX},${tileY}`;
        if (!this.visibleTiles.has(key)) {
          const worldX = this.worldToWorldX(tileX);
          const worldY = this.worldToWorldY(tileY);
          this.fogGraphics.fillRect(worldX, worldY, this.tileSize, this.tileSize);
        }
      }
    }
  }

  isRoomEdgeOpen(openEdges, ax, ay, bx, by) {
    const a = `${ax},${ay}`;
    const b = `${bx},${by}`;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    return openEdges.has(key);
  }

  buildWalkableTiles(floor) {
    this.walkableTiles.clear();
    
    floor.rooms.forEach(room => {
      for (let y = 0; y < room.h; y++) {
        for (let x = 0; x < room.w; x++) {
          if (room.maze[y][x].type === 'floor') {
            this.walkableTiles.add(`${room.x + x},${room.y + y}`);
          }
        }
      }
    });
    
    floor.corridorTiles.forEach(tile => {
      this.walkableTiles.add(`${tile.x},${tile.y}`);
    });
    
    floor.stairs.forEach(stair => {
      this.walkableTiles.add(`${stair.x},${stair.y}`);
    });
  }

  placePlayer(floor) {
    if (!this.player) {
      const startRoom = floor.rooms.find(r => r.isStart);
      if (startRoom && startRoom.startPos) {
        this.player = this.add.circle(
          this.worldToWorldX(startRoom.startPos.x) + this.tileSize/2,
          this.worldToWorldY(startRoom.startPos.y) + this.tileSize/2,
          8, 0x00ff00
        );
      } else {
        const tile = this.findAnyFloorTile(floor);
        this.player = this.add.circle(
          this.worldToWorldX(tile.x) + this.tileSize/2,
          this.worldToWorldY(tile.y) + this.tileSize/2,
          8, 0x00ff00
        );
      }
    } else {
      const targetDir = this.lastStairDir === 'down' ? 'up' : 'down';
      const stair = floor.stairs.find(s => s.dir === targetDir);
      if (stair) {
        this.player.setPosition(
          this.worldToWorldX(stair.x) + this.tileSize/2,
          this.worldToWorldY(stair.y) + this.tileSize/2
        );
      } else {
        const tile = this.findAnyFloorTile(floor);
        this.player.setPosition(
          this.worldToWorldX(tile.x) + this.tileSize/2,
          this.worldToWorldY(tile.y) + this.tileSize/2
        );
      }
    }
    this.player.setDepth(20);
    
    const playerTileX = Math.floor((this.player.x - this.worldOffset.x) / this.tileSize);
    const playerTileY = Math.floor((this.player.y - this.worldOffset.y) / this.tileSize);
    for (let dy = -this.revealRadius; dy <= this.revealRadius; dy++) {
      for (let dx = -this.revealRadius; dx <= this.revealRadius; dx++) {
        this.visibleTiles.add(`${playerTileX + dx},${playerTileY + dy}`);
      }
    }
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
    if (floor.corridorTiles.length > 0) return floor.corridorTiles[0];
    return { x: 20, y: 20 };
  }

  update() {
    if (!this.player || !this.currentFloorData) return;
    
    let dx = 0, dy = 0;
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
      this.floorBounds.minX + this.floorBounds.width - 8
    );
    this.player.y = Phaser.Math.Clamp(
      this.player.y,
      this.floorBounds.minY + 8,
      this.floorBounds.minY + this.floorBounds.height - 8
    );
    
    this.updateFog();
    
    this.checkStairs();
    this.checkExit();
    this.checkEntrance();
    
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
  }

  canMoveTo(worldX, worldY) {
    const tileX = Math.floor((worldX - this.worldOffset.x) / this.tileSize);
    const tileY = Math.floor((worldY - this.worldOffset.y) / this.tileSize);
    const tileKey = `${tileX},${tileY}`;
    
    if (!this.walkableTiles.has(tileKey)) {
      return false;
    }
    
    const currentTileX = Math.floor((this.player.x - this.worldOffset.x) / this.tileSize);
    const currentTileY = Math.floor((this.player.y - this.worldOffset.y) / this.tileSize);
    
    if (currentTileX === tileX && currentTileY === tileY) {
      return true;
    }
    
    const floor = this.currentFloorData;
    const fromRoom = this.getRoomAtTile(floor, currentTileX, currentTileY);
    const toRoom = this.getRoomAtTile(floor, tileX, tileY);
    
    if (!fromRoom || !toRoom || fromRoom !== toRoom) {
      return true;
    }
    
    const localFromX = currentTileX - fromRoom.x;
    const localFromY = currentTileY - fromRoom.y;
    const localToX = tileX - fromRoom.x;
    const localToY = tileY - fromRoom.y;
    
    const openEdges = this.roomOpenEdges.get(fromRoom.id);
    if (!openEdges) return false;
    
    return this.isRoomEdgeOpen(openEdges, localFromX, localFromY, localToX, localToY);
  }

  getRoomAtTile(floor, tileX, tileY) {
    for (const room of floor.rooms) {
      if (tileX >= room.x && tileX < room.x + room.w &&
          tileY >= room.y && tileY < room.y + room.h) {
        return room;
      }
    }
    return null;
  }

  checkStairs() {
    const floor = this.dungeon.floors[this.currentFloor];
    let found = null;
    
    floor.stairs.forEach(stair => {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        this.worldToWorldX(stair.x) + this.tileSize/2,
        this.worldToWorldY(stair.y) + this.tileSize/2
      );
      if (dist < 20) found = stair;
    });
    
    if (found) {
      this.nearStair = found;
      if (!this.stairPrompt) {
        this.stairPrompt = this.add.text(
          this.player.x, this.player.y - 30,
          'Press E to go ' + (found.dir === 'up' ? 'UP' : 'DOWN'),
          { fontSize: '14px', fill: '#ff0', backgroundColor: '#000', padding: { x: 4, y: 2 } }
        ).setOrigin(0.5);
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
    const floor = this.dungeon.floors[this.currentFloor];
    const endRoom = floor.rooms.find(r => r.isEnd);
    
    if (endRoom && endRoom.endPos) {
      const tileCenterX = this.worldToWorldX(endRoom.endPos.x) + this.tileSize/2;
      const tileCenterY = this.worldToWorldY(endRoom.endPos.y) + this.tileSize/2;
      
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        tileCenterX, tileCenterY
      );
      
      if (dist < 20) {
        this.nearExit = true;
        if (!this.exitPrompt) {
          this.exitPrompt = this.add.text(
            this.player.x, this.player.y - 30,
            'Press E to exit dungeon',
            { fontSize: '14px', fill: '#0ff', backgroundColor: '#000', padding: { x: 4, y: 2 } }
          ).setOrigin(0.5);
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
    const floor = this.dungeon.floors[this.currentFloor];
    
    if (this.currentFloor !== 0) {
      this.nearEntrance = false;
      if (this.entrancePrompt) {
        this.entrancePrompt.destroy();
        this.entrancePrompt = null;
      }
      return;
    }
    
    const startRoom = floor.rooms.find(r => r.isStart);
    if (startRoom && startRoom.startPos) {
      const tileCenterX = this.worldToWorldX(startRoom.startPos.x) + this.tileSize/2;
      const tileCenterY = this.worldToWorldY(startRoom.startPos.y) + this.tileSize/2;
      
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        tileCenterX, tileCenterY
      );
      
      if (dist < 8) {
        this.nearEntrance = true;
        if (!this.entrancePrompt) {
          this.entrancePrompt = this.add.text(
            this.player.x, this.player.y - 30,
            'ENTRANCE: Press Q to leave',
            { 
              fontSize: '14px', 
              fill: '#0f0', 
              backgroundColor: '#000',
              padding: { x: 6, y: 3 }
            }
          ).setOrigin(0.5);
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
