// dungeonGenerator.js

function generateDungeon() {
  const GRID_WIDTH = 52;
  const GRID_HEIGHT = 42;

  // Random number of floors between 1-4
  const numFloors = 1 + Math.floor(Math.random() * 4);
  const dungeon = {
    floors: [],
    totalFloors: numFloors,
  };

  // Helper functions
  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function inBounds(x, y) {
    return x >= 0 && y >= 0 && x < GRID_WIDTH && y < GRID_HEIGHT;
  }

  function isInsideRoom(x, y, room, padding = 0) {
    return x >= room.x - padding && x < room.x + room.w + padding &&
      y >= room.y - padding && y < room.y + room.h + padding;
  }

  function isInsideAnyRoom(x, y, rooms, padding = 0) {
    return rooms.some((room) => isInsideRoom(x, y, room, padding));
  }

  // Check if a tile is adjacent to a room (touching the room boundary)
  function isAdjacentToRoom(x, y, room) {
    // Check if tile is just outside the room on any side
    return (x === room.x - 1 && y >= room.y && y < room.y + room.h) || // Left side
      (x === room.x + room.w && y >= room.y && y < room.y + room.h) || // Right side
      (y === room.y - 1 && x >= room.x && x < room.x + room.w) || // Top side
      (y === room.y + room.h && x >= room.x && x < room.x + room.w); // Bottom side
  }

  function initRoomMaze(room) {
    room.maze = [];
    for (let y = 0; y < room.h; y++) {
      room.maze[y] = [];
      for (let x = 0; x < room.w; x++) {
        room.maze[y][x] = { type: 'wall', hasItem: false, hasEnemy: false };
      }
    }
  }

  function carveRoomMaze(room) {
    initRoomMaze(room);
    room.miniChambers = [];
    room.openEdges = [];
    room.edgeDoorSlots = { left: [], right: [], top: [], bottom: [] };

    if (room.w <= 1 || room.h <= 1) return;

    const inMiniChamber = (lx, ly) =>
      room.miniChambers.some((c) =>
        lx >= c.x && lx < c.x + c.w && ly >= c.y && ly < c.y + c.h
      );

    const canUse = (lx, ly) =>
      lx >= 0 && ly >= 0 && lx < room.w && ly < room.h &&
      !inMiniChamber(lx, ly);

    // Add 1-2 mini chambers
    const numChambers = rand(1, 2);
    for (
      let attempt = 0;
      attempt < 40 && room.miniChambers.length < numChambers;
      attempt++
    ) {
      const cw = rand(2, Math.min(3, room.w));
      const ch = rand(2, Math.min(3, room.h));
      if (room.w - cw < 2 || room.h - ch < 2) continue;

      const cx = rand(1, room.w - cw - 1);
      const cy = rand(1, room.h - ch - 1);

      const overlaps = room.miniChambers.some((c) => {
        return !(cx + cw + 1 < c.x || cx > c.x + c.w + 1 ||
          cy + ch + 1 < c.y || cy > c.y + c.h + 1);
      });
      if (overlaps) continue;

      room.miniChambers.push({ x: cx, y: cy, w: cw, h: ch });
    }

    const nodes = [];
    for (let y = 0; y < room.h; y++) {
      for (let x = 0; x < room.w; x++) {
        if (canUse(x, y)) {
          room.maze[y][x].type = 'floor';
          nodes.push({ x, y });
        }
      }
    }
    if (nodes.length === 0) return;

    const openEdges = new Set();
    const visited = new Set();
    const nodeKey = (x, y) => `${x},${y}`;
    const edgeKey = (ax, ay, bx, by) => {
      const a = nodeKey(ax, ay);
      const b = nodeKey(bx, by);
      return a < b ? `${a}|${b}` : `${b}|${a}`;
    };

    const neighbors = (cell) => {
      const out = [];
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of dirs) {
        const nx = cell.x + dx;
        const ny = cell.y + dy;
        if (canUse(nx, ny)) out.push({ x: nx, y: ny });
      }
      return out;
    };

    function dfs(start) {
      const stack = [start];
      visited.add(nodeKey(start.x, start.y));
      while (stack.length > 0) {
        const cur = stack[stack.length - 1];
        const nextMoves = shuffle(neighbors(cur)).filter((n) =>
          !visited.has(nodeKey(n.x, n.y))
        );
        if (nextMoves.length === 0) {
          stack.pop();
          continue;
        }
        const next = nextMoves[0];
        openEdges.add(edgeKey(cur.x, cur.y, next.x, next.y));
        visited.add(nodeKey(next.x, next.y));
        stack.push(next);
      }
    }

    dfs(nodes[rand(0, nodes.length - 1)]);

    // Connect disconnected components
    while (visited.size < nodes.length) {
      const start = nodes.find((n) => !visited.has(nodeKey(n.x, n.y)));
      if (!start) break;

      const queue = [start];
      const seen = new Set([nodeKey(start.x, start.y)]);
      const parent = new Map();
      let hit = null;

      while (queue.length > 0 && !hit) {
        const cur = queue.shift();
        for (const n of neighbors(cur)) {
          const nk = nodeKey(n.x, n.y);
          if (seen.has(nk)) continue;
          seen.add(nk);
          parent.set(nk, nodeKey(cur.x, cur.y));
          if (visited.has(nk)) {
            hit = n;
            break;
          }
          queue.push(n);
        }
      }

      if (!hit) break;

      let k = nodeKey(hit.x, hit.y);
      while (k) {
        const prev = parent.get(k);
        if (!prev) break;
        const [x1, y1] = k.split(',').map(Number);
        const [x0, y0] = prev.split(',').map(Number);
        openEdges.add(edgeKey(x0, y0, x1, y1));
        visited.add(nodeKey(x0, y0));
        visited.add(nodeKey(x1, y1));
        k = prev;
      }
      dfs(start);
    }

    // Carve mini chambers
    for (const ch of room.miniChambers) {
      for (let y = ch.y; y < ch.y + ch.h; y++) {
        for (let x = ch.x; x < ch.x + ch.w; x++) {
          room.maze[y][x].type = 'floor';
          if (x + 1 < ch.x + ch.w) openEdges.add(edgeKey(x, y, x + 1, y));
          if (y + 1 < ch.y + ch.h) openEdges.add(edgeKey(x, y, x, y + 1));
        }
      }

      const doorCandidates = [];
      for (let y = ch.y; y < ch.y + ch.h; y++) {
        for (let x = ch.x; x < ch.x + ch.w; x++) {
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
            const nx = x + dx;
            const ny = y + dy;
            if (canUse(nx, ny)) doorCandidates.push({ x, y, nx, ny });
          });
        }
      }

      if (doorCandidates.length > 0) {
        doorCandidates.forEach((d) =>
          openEdges.delete(edgeKey(d.x, d.y, d.nx, d.ny))
        );
        const chosen = doorCandidates[rand(0, doorCandidates.length - 1)];
        openEdges.add(edgeKey(chosen.x, chosen.y, chosen.nx, chosen.ny));
      }
    }

    room.openEdges = [...openEdges];
    ensureConnectivity(room);
  }

  function ensureConnectivity(room) {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const nodeKey = (x, y) => `${x},${y}`;
    const edgeKey = (ax, ay, bx, by) => {
      const a = nodeKey(ax, ay);
      const b = nodeKey(bx, by);
      return a < b ? `${a}|${b}` : `${b}|${a}`;
    };

    const inMiniChamber = (lx, ly) =>
      (room.miniChambers || []).some((c) =>
        lx >= c.x && lx < c.x + c.w && ly >= c.y && ly < c.y + c.h
      );

    const canUse = (lx, ly) =>
      lx >= 0 && ly >= 0 && lx < room.w && ly < room.h &&
      !inMiniChamber(lx, ly);

    const nodes = [];
    for (let y = 0; y < room.h; y++) {
      for (let x = 0; x < room.w; x++) {
        if (canUse(x, y) || inMiniChamber(x, y)) {
          room.maze[y][x].type = 'floor';
          if (canUse(x, y)) nodes.push({ x, y });
        } else {
          room.maze[y][x].type = 'wall';
        }
      }
    }
    if (nodes.length === 0) {
      room.openEdges = [];
      return;
    }

    const edges = new Set(room.openEdges || []);

    const neighbors = (cell) => {
      const list = [];
      for (const [dx, dy] of dirs) {
        const nx = cell.x + dx;
        const ny = cell.y + dy;
        if (canUse(nx, ny)) list.push({ x: nx, y: ny });
      }
      return list;
    };

    const flood = (seed) => {
      const queue = [seed];
      const seen = new Set([nodeKey(seed.x, seed.y)]);
      while (queue.length > 0) {
        const cur = queue.shift();
        for (const n of neighbors(cur)) {
          if (!edges.has(edgeKey(cur.x, cur.y, n.x, n.y))) continue;
          const nk = nodeKey(n.x, n.y);
          if (seen.has(nk)) continue;
          seen.add(nk);
          queue.push(n);
        }
      }
      return seen;
    };

    let connected = flood(nodes[0]);

    while (connected.size < nodes.length) {
      const start = nodes.find((n) => !connected.has(nodeKey(n.x, n.y)));
      if (!start) break;

      const queue = [start];
      const seen = new Set([nodeKey(start.x, start.y)]);
      const parent = new Map();
      let hit = null;

      while (queue.length > 0 && !hit) {
        const cur = queue.shift();
        for (const n of neighbors(cur)) {
          const nk = nodeKey(n.x, n.y);
          if (seen.has(nk)) continue;
          seen.add(nk);
          parent.set(nk, nodeKey(cur.x, cur.y));
          if (connected.has(nk)) {
            hit = n;
            break;
          }
          queue.push(n);
        }
      }

      if (!hit) break;

      let k = nodeKey(hit.x, hit.y);
      while (k) {
        const prev = parent.get(k);
        if (!prev) break;
        const [x1, y1] = k.split(',').map(Number);
        const [x0, y0] = prev.split(',').map(Number);
        edges.add(edgeKey(x0, y0, x1, y1));
        k = prev;
      }
      connected = flood(nodes[0]);
    }

    room.openEdges = [...edges];
  }

  function carveDoorway(room, outsideTile) {
    let insideX = clamp(outsideTile.x, room.x, room.x + room.w - 1);
    let insideY = clamp(outsideTile.y, room.y, room.y + room.h - 1);

    let side = 'internal';
    if (outsideTile.x < room.x) {
      insideX = room.x;
      side = 'left';
    } else if (outsideTile.x >= room.x + room.w) {
      insideX = room.x + room.w - 1;
      side = 'right';
    } else if (outsideTile.y < room.y) {
      insideY = room.y;
      side = 'top';
    } else if (outsideTile.y >= room.y + room.h) {
      insideY = room.y + room.h - 1;
      side = 'bottom';
    }

    if (side !== 'internal') {
      const slots = room.edgeDoorSlots ||
        { left: [], right: [], top: [], bottom: [] };
      room.edgeDoorSlots = slots;

      const desired = (side === 'left' || side === 'right')
        ? clamp(insideY - room.y, 0, room.h - 1)
        : clamp(insideX - room.x, 0, room.w - 1);

      const max = (side === 'left' || side === 'right')
        ? room.h - 1
        : room.w - 1;

      let chosen = desired;
      for (let d = 0; d <= max; d++) {
        if (
          desired - d >= 0 &&
          slots[side].every((e) => Math.abs(e - (desired - d)) >= 2)
        ) {
          chosen = desired - d;
          break;
        }
        if (
          desired + d <= max &&
          slots[side].every((e) => Math.abs(e - (desired + d)) >= 2)
        ) {
          chosen = desired + d;
          break;
        }
      }

      slots[side].push(chosen);

      if (side === 'left' || side === 'right') {
        insideY = room.y + chosen;
      } else {
        insideX = room.x + chosen;
      }
    }

    const localX = insideX - room.x;
    const localY = insideY - room.y;
    room.maze[localY][localX].type = 'floor';

    const inwardX = clamp(
      localX +
        (outsideTile.x < room.x
          ? 1
          : outsideTile.x >= room.x + room.w
          ? -1
          : 0),
      0,
      room.w - 1,
    );
    const inwardY = clamp(
      localY +
        (outsideTile.y < room.y
          ? 1
          : outsideTile.y >= room.y + room.h
          ? -1
          : 0),
      0,
      room.h - 1,
    );
    room.maze[inwardY][inwardX].type = 'floor';

    connectPointToRoomMaze(room, inwardX, inwardY);
    return { x: insideX, y: insideY };
  }

  function connectPointToRoomMaze(room, startX, startY) {
    const nodeKey = (x, y) => `${x},${y}`;
    const edgeKey = (ax, ay, bx, by) => {
      const a = nodeKey(ax, ay);
      const b = nodeKey(bx, by);
      return a < b ? `${a}|${b}` : `${b}|${a}`;
    };

    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    const inBounds = (x, y) => x >= 0 && y >= 0 && x < room.w && y < room.h;
    const inChamber = (x, y) =>
      (room.miniChambers || []).some((c) =>
        x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h
      );

    if (!inBounds(startX, startY) || inChamber(startX, startY)) return;

    const floorSeeds = [];
    for (let y = 0; y < room.h; y++) {
      for (let x = 0; x < room.w; x++) {
        if (
          (x !== startX || y !== startY) && !inChamber(x, y) &&
          room.maze[y][x].type === 'floor'
        ) {
          floorSeeds.push({ x, y });
        }
      }
    }
    if (floorSeeds.length === 0) return;

    const seedSet = new Set(floorSeeds.map((p) => nodeKey(p.x, p.y)));
    const openEdges = new Set(room.openEdges || []);

    const queue = [{ x: startX, y: startY }];
    const visited = new Set([nodeKey(startX, startY)]);
    const parent = new Map();
    let hit = null;

    while (queue.length > 0 && !hit) {
      const cur = queue.shift();
      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (!inBounds(nx, ny) || inChamber(nx, ny)) continue;

        const nk = nodeKey(nx, ny);
        if (visited.has(nk)) continue;

        visited.add(nk);
        parent.set(nk, nodeKey(cur.x, cur.y));
        if (seedSet.has(nk)) {
          hit = { x: nx, y: ny };
          break;
        }
        queue.push({ x: nx, y: ny });
      }
    }

    if (!hit) return;

    let k = nodeKey(hit.x, hit.y);
    while (k) {
      const [x, y] = k.split(',').map(Number);
      if (!inChamber(x, y)) room.maze[y][x].type = 'floor';

      const prev = parent.get(k);
      if (prev) {
        const [px, py] = prev.split(',').map(Number);
        openEdges.add(edgeKey(x, y, px, py));
      }
      k = parent.get(k);
    }

    room.openEdges = [...openEdges];
    ensureConnectivity(room);
  }

  function pathKey(x, y) {
    return `${x},${y}`;
  }

  function findPath(start, goal, rooms, occupied) {
    if (!inBounds(start.x, start.y) || !inBounds(goal.x, goal.y)) return null;
    if (
      occupied.has(pathKey(start.x, start.y)) ||
      occupied.has(pathKey(goal.x, goal.y))
    ) return null;

    const queue = [start];
    const visited = new Set([pathKey(start.x, start.y)]);
    const parents = new Map();
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    while (queue.length > 0) {
      const cur = queue.shift();
      if (cur.x === goal.x && cur.y === goal.y) {
        const path = [];
        let key = pathKey(goal.x, goal.y);
        while (key) {
          const [x, y] = key.split(',').map(Number);
          path.push({ x, y });
          key = parents.get(key);
        }
        return path.reverse();
      }

      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const nKey = pathKey(nx, ny);

        if (!inBounds(nx, ny) || visited.has(nKey)) continue;

        const isAnchor = (nx === start.x && ny === start.y) ||
          (nx === goal.x && ny === goal.y);

        // Stricter room adjacency check - don't allow paths to run parallel to room walls
        if (isInsideAnyRoom(nx, ny, rooms, 0)) continue;

        // Check if this tile would be adjacent to a room (but not at the anchor points)
        let adjacentToRoom = false;
        if (!isAnchor) {
          for (const room of rooms) {
            if (isAdjacentToRoom(nx, ny, room)) {
              adjacentToRoom = true;
              break;
            }
          }
        }

        if (adjacentToRoom) continue;

        // Also check if moving along this direction would create a path that runs parallel to a room
        // This is a bit complex - for now, just prevent paths from being too close to rooms
        if (!isAnchor && isInsideAnyRoom(nx, ny, rooms, 1)) continue;

        if (occupied.has(nKey)) continue;

        visited.add(nKey);
        parents.set(nKey, pathKey(cur.x, cur.y));
        queue.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  // Updated function to add longer dead end paths (minimum 5 tiles)
  function addDeadEndPath(mainPath, rooms, occupied, deadEndIndex) {
    if (!mainPath || mainPath.length < 4) return null;

    // Pick a point along the main path (not the ends)
    const branchPoint = mainPath[rand(1, mainPath.length - 2)];

    // Try each direction
    const dirs = shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]);

    for (const [dx, dy] of dirs) {
      const length = rand(5, 8); // Increased to 5-8 tiles long
      const points = [];
      let ok = true;

      // Check each potential tile
      for (let step = 1; step <= length; step++) {
        const nx = branchPoint.x + dx * step;
        const ny = branchPoint.y + dy * step;
        const key = pathKey(nx, ny);

        // Check if tile is valid
        if (
          !inBounds(nx, ny) ||
          isInsideAnyRoom(nx, ny, rooms, 0) ||
          occupied.has(key)
        ) {
          ok = false;
          break;
        }

        // Also check that this dead end tile isn't adjacent to any room
        let adjacentToRoom = false;
        for (const room of rooms) {
          if (isAdjacentToRoom(nx, ny, room)) {
            adjacentToRoom = true;
            break;
          }
        }
        if (adjacentToRoom) {
          ok = false;
          break;
        }

        points.push({ x: nx, y: ny });
      }

      // Also check the tile before the branch point isn't adjacent to a room
      if (ok && points.length >= 5) { // At least 5 tiles long
        // Mark all tiles as occupied
        points.forEach((p) => occupied.add(pathKey(p.x, p.y)));

        // Add wall tiles around the dead end to prevent fusion and room adjacency
        points.forEach((p) => {
          // Check adjacent tiles and mark them as blocked if they're not already paths
          for (const [checkDx, checkDy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const checkX = p.x + checkDx;
            const checkY = p.y + checkDy;
            const checkKey = pathKey(checkX, checkY);

            // If this adjacent tile isn't already occupied and isn't a room, mark it as a wall zone
            if (
              !occupied.has(checkKey) &&
              !isInsideAnyRoom(checkX, checkY, rooms, 0)
            ) {
              // We'll handle this in the corridor wall generation
            }
          }
        });

        return {
          from: 'deadend',
          to: `deadend-${deadEndIndex}`,
          points: [branchPoint, ...points],
        };
      }
    }

    return null;
  }

  function pickFloorTile(room, blockedTiles, minDist = 5, hardMin = 2) {
    const tiles = [];
    for (let y = 0; y < room.h; y++) {
      for (let x = 0; x < room.w; x++) {
        if (room.maze?.[y]?.[x]?.type === 'floor') {
          tiles.push({ x: room.x + x, y: room.y + y });
        }
      }
    }
    if (tiles.length === 0) {
      return {
        x: room.x + Math.floor(room.w / 2),
        y: room.y + Math.floor(room.h / 2),
      };
    }

    shuffle(tiles);

    const far = tiles.find((t) =>
      blockedTiles.every((b) =>
        Math.abs(t.x - b.x) + Math.abs(t.y - b.y) >= minDist
      )
    );
    if (far) return far;

    const ok = tiles.find((t) =>
      blockedTiles.every((b) =>
        Math.abs(t.x - b.x) + Math.abs(t.y - b.y) >= hardMin
      )
    );
    return ok || tiles[0];
  }

  function pickEnemySpawnTile(room, blockedTiles, minDist = 4, hardMin = 2) {
    const blockedKeys = new Set(
      blockedTiles.map((tile) => `${tile.x},${tile.y}`),
    );
    const tiles = [];

    for (let y = 0; y < room.h; y++) {
      for (let x = 0; x < room.w; x++) {
        if (room.maze?.[y]?.[x]?.type === 'floor') {
          const tile = { x: room.x + x, y: room.y + y };
          if (!blockedKeys.has(`${tile.x},${tile.y}`)) {
            tiles.push(tile);
          }
        }
      }
    }

    if (tiles.length === 0) {
      return null;
    }

    shuffle(tiles);

    const far = tiles.find((tile) =>
      blockedTiles.every((blockedTile) =>
        Math.abs(tile.x - blockedTile.x) + Math.abs(tile.y - blockedTile.y) >=
          minDist
      )
    );
    if (far) return far;

    const ok = tiles.find((tile) =>
      blockedTiles.every((blockedTile) =>
        Math.abs(tile.x - blockedTile.x) + Math.abs(tile.y - blockedTile.y) >=
          hardMin
      )
    );
    return ok || null;
  }

  const lootboxNoise = typeof FastNoiseLite === 'function'
    ? new FastNoiseLite(rand(1, 999999))
    : null;
  if (lootboxNoise) {
    lootboxNoise.SetNoiseType(FastNoiseLite.NoiseType.Perlin);
    lootboxNoise.SetFrequency(0.09);
  }

  // Generate each floor
  for (let f = 0; f < numFloors; f++) {
    const numRooms = rand(2, 4);
    const rooms = [];

    // Place rooms
    for (let r = 0; r < numRooms; r++) {
      let attempts = 0;
      let placed = false;

      while (!placed && attempts < 100) {
        const w = rand(5, 10);
        const h = rand(5, 10);
        const x = rand(2, GRID_WIDTH - 3 - w);
        const y = rand(2, GRID_HEIGHT - 3 - h);

        const overlap = rooms.some((room) =>
          !(x + w + 2 < room.x || x > room.x + room.w + 2 ||
            y + h + 2 < room.y || y > room.y + room.h + 2)
        );

        if (!overlap) {
          rooms.push({
            id: `f${f}r${r}`,
            x,
            y,
            w,
            h,
            maze: [],
            items: [],
            enemies: [],
            chests: [],
          });
          placed = true;
        }
        attempts++;
      }
    }

    // Make sure we have at least 2 rooms
    if (rooms.length < 2) {
      rooms.length = 0;
      rooms.push({
        id: `f${f}r0`,
        x: 6,
        y: 6,
        w: 8,
        h: 8,
        maze: [],
        items: [],
        enemies: [],
        chests: [],
      });
      rooms.push({
        id: `f${f}r1`,
        x: 28,
        y: 24,
        w: 8,
        h: 8,
        maze: [],
        items: [],
        enemies: [],
        chests: [],
      });
    }

    // Carve mazes in rooms
    rooms.forEach(carveRoomMaze);

    // Connect rooms with paths
    rooms.sort((a, b) => a.x + a.y - (b.x + b.y));
    rooms.forEach((room, index) => {
      room.roomIndex = index + 1;
      room.roomLabel = `Room ${index + 1}`;
    });
    const paths = [];
    const occupied = new Set();
    const roomDoors = new Map(rooms.map((r) => [r.id, new Set()]));
    let deadEndIndex = 0;

    for (let i = 0; i < rooms.length - 1; i++) {
      const r1 = rooms[i];
      const r2 = rooms[i + 1];

      // Try to find a path between rooms
      let path = null;
      for (let attempts = 0; attempts < 30 && !path; attempts++) {
        const start = {
          x: r1.x + (Math.random() > 0.5 ? -1 : r1.w),
          y: clamp(
            r1.y + Math.floor(Math.random() * r1.h),
            r1.y,
            r1.y + r1.h - 1,
          ),
        };
        const goal = {
          x: r2.x + (Math.random() > 0.5 ? -1 : r2.w),
          y: clamp(
            r2.y + Math.floor(Math.random() * r2.h),
            r2.y,
            r2.y + r2.h - 1,
          ),
        };
        path = findPath(start, goal, rooms, occupied);
      }

      if (path && path.length >= 2) {
        const startDoor = carveDoorway(r1, path[0]);
        const endDoor = carveDoorway(r2, path[path.length - 1]);

        roomDoors.get(r1.id).add(pathKey(startDoor.x, startDoor.y));
        roomDoors.get(r2.id).add(pathKey(endDoor.x, endDoor.y));

        const fullPath = [startDoor, ...path, endDoor];
        fullPath.forEach((p) => occupied.add(pathKey(p.x, p.y)));
        paths.push({ from: r1.id, to: r2.id, points: fullPath });

        // Add a dead end path from this main path
        const deadEnd = addDeadEndPath(fullPath, rooms, occupied, deadEndIndex);
        if (deadEnd) {
          deadEndIndex++;
          paths.push(deadEnd);
        }
      }
    }

    // Also try to add dead ends from each room
    rooms.forEach((room) => {
      // Find a path that connects to this room
      const roomPaths = paths.filter((p) =>
        p.from === room.id || p.to === room.id
      );
      if (roomPaths.length > 0) {
        // Pick a random path connected to this room
        const path = roomPaths[rand(0, roomPaths.length - 1)];
        const deadEnd = addDeadEndPath(
          path.points,
          rooms,
          occupied,
          deadEndIndex,
        );
        if (deadEnd) {
          deadEndIndex++;
          paths.push(deadEnd);
        }
      }
    });

    // Clean up corridor tiles and prevent fusion
    const corridorMap = new Map();
    occupied.forEach((cellKey) => {
      const [x, y] = cellKey.split(',').map(Number);
      corridorMap.set(cellKey, { x, y, connections: 0 });
    });

    // Count connections for each corridor tile
    corridorMap.forEach((tile) => {
      const [x, y] = [tile.x, tile.y];
      let connections = 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const neighborKey = pathKey(x + dx, y + dy);
        if (corridorMap.has(neighborKey)) connections++;
      });

      tile.connections = connections;
    });

    // Build final corridor list with walls between adjacent corridors
    const finalCorridors = [];
    const corridorWalls = [];

    corridorMap.forEach((tile) => {
      finalCorridors.push({ x: tile.x, y: tile.y });

      const [x, y] = [tile.x, tile.y];
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        const neighborKey = pathKey(nx, ny);

        if (corridorMap.has(neighborKey)) {
          // Check if these two corridors are part of the same path
          let samePath = false;
          paths.forEach((path) => {
            for (let i = 0; i < path.points.length - 1; i++) {
              const p1 = path.points[i];
              const p2 = path.points[i + 1];
              if (
                (p1.x === x && p1.y === y && p2.x === nx && p2.y === ny) ||
                (p2.x === x && p2.y === y && p1.x === nx && p1.y === ny)
              ) {
                samePath = true;
              }
            }
          });

          if (!samePath) {
            corridorWalls.push({ x1: x, y1: y, x2: nx, y2: ny });
          }
        }
      });
    });

    // Filter out tiles that are inside rooms (doors)
    const cleanedCorridors = finalCorridors.filter((tile) => {
      return !rooms.some((r) => isInsideRoom(tile.x, tile.y, r));
    });

    // Add stairs
    const stairs = [];
    const blocked = [];

    if (f < numFloors - 1) {
      const room = rooms[Math.floor(Math.random() * rooms.length)];
      const tile = pickFloorTile(room, blocked);
      stairs.push({ x: tile.x, y: tile.y, dir: 'down', toFloor: f + 1 });
      blocked.push(tile);
    }

    if (f > 0) {
      const room = rooms[Math.floor(Math.random() * rooms.length)];
      const tile = pickFloorTile(room, blocked);
      stairs.push({ x: tile.x, y: tile.y, dir: 'up', toFloor: f - 1 });
      blocked.push(tile);
    }

    // Mark start room on first floor
    if (f === 0 && rooms.length > 0) {
      rooms[0].isStart = true;
      const tile = pickFloorTile(rooms[0], blocked, 4, 2);
      rooms[0].startPos = { x: tile.x, y: tile.y };
      blocked.push(tile);
    }

    // Mark end room on last floor
    if (f === numFloors - 1 && rooms.length > 0) {
      rooms[rooms.length - 1].isEnd = true;
      const tile = pickFloorTile(rooms[rooms.length - 1], blocked, 6, 3);
      rooms[rooms.length - 1].endPos = { x: tile.x, y: tile.y };
      blocked.push(tile);
    }

    const floorDepth = f + 1;

    rooms.forEach((room) => {
      const minEnemies = Math.min(2, 1 + Math.floor(f / 2));
      const maxEnemies = Math.min(4, 1 + floorDepth);
      const targetEnemyCount = maxEnemies > minEnemies
        ? rand(minEnemies, maxEnemies)
        : minEnemies;

      room.enemies = [];

      for (let enemyIndex = 0; enemyIndex < targetEnemyCount; enemyIndex++) {
        const roomEnemySpacing = enemyIndex === 0 ? 4 : 5;
        const enemyTile = pickEnemySpawnTile(
          room,
          blocked,
          roomEnemySpacing,
          3,
        );
        if (!enemyTile) {
          break;
        }

        room.enemies.push({
          id: `${room.id}-enemy-${enemyIndex}`,
          x: enemyTile.x,
          y: enemyTile.y,
        });
        blocked.push(enemyTile);
      }
    });

    const chestTierWeights = [50, 25, 13, 6, 3, 1];
    const chestTierTotal = chestTierWeights.reduce((a, b) => a + b, 0);
    const rollChestTier = () => {
      let r = Math.random() * chestTierTotal;
      for (let t = 0; t < chestTierWeights.length; t++) {
        if (r < chestTierWeights[t]) return t + 1;
        r -= chestTierWeights[t];
      }
      return 1;
    };

    // Build pool of all walkable tiles: room floors + corridor tiles
    const blockedKeys = new Set(blocked.map((t) => `${t.x},${t.y}`));
    const allWalkable = [];

    rooms.forEach((room) => {
      room.chests = [];
      for (let ry = 0; ry < room.h; ry++) {
        for (let rx = 0; rx < room.w; rx++) {
          if (room.maze?.[ry]?.[rx]?.type === 'floor') {
            const tile = { x: room.x + rx, y: room.y + ry };
            if (!blockedKeys.has(`${tile.x},${tile.y}`)) {
              allWalkable.push(tile);
            }
          }
        }
      }
    });

    cleanedCorridors.forEach((tile) => {
      if (!blockedKeys.has(`${tile.x},${tile.y}`)) {
        allWalkable.push(tile);
      }
    });

    shuffle(allWalkable);

    // Spawn chest count based on floor room count.
    const numChests = rooms.length + 2;
    const floorChests = [];
    let chestIndex = 0;

    for (let c = 0; c < numChests && chestIndex < allWalkable.length; c++) {
      const chestTile = allWalkable[chestIndex++];
      const boxTier = rollChestTier();
      floorChests.push({
        id: `floor-${f}-lootbox-${c}`,
        x: chestTile.x,
        y: chestTile.y,
        boxTier,
        isTrap: Math.random() < 0.1,
      });
      blockedKeys.add(`${chestTile.x},${chestTile.y}`);
      blocked.push(chestTile);
    }

    dungeon.floors.push({
      index: f,
      floorDepth,
      rooms: rooms,
      paths: paths,
      stairs: stairs,
      corridorTiles: cleanedCorridors,
      corridorWalls: corridorWalls,
      chests: floorChests,
    });
  }

  return dungeon;
}

globalThis.generateDungeon = generateDungeon;
