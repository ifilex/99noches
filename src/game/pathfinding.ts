// Grid-based A* Pathfinding Engine for NES 8-Bit Overworld & Interiors

export const TILE_SIZE = 32;

export interface PathNode {
  x: number; // grid x
  y: number; // grid y
  g: number; // cost from start
  h: number; // heuristic cost to goal
  f: number; // total cost (g + h)
  parent?: PathNode;
}

export interface GridPoint {
  x: number;
  y: number;
}

export class PathfindingGrid {
  private gridWidth: number;
  private gridHeight: number;
  private blockedTiles: Uint8Array; // 1 = solid/blocked, 0 = walkable

  constructor(worldWidth: number, worldHeight: number) {
    this.gridWidth = Math.ceil(worldWidth / TILE_SIZE);
    this.gridHeight = Math.ceil(worldHeight / TILE_SIZE);
    this.blockedTiles = new Uint8Array(this.gridWidth * this.gridHeight);
  }

  public resetGrid() {
    this.blockedTiles.fill(0);
  }

  public setBlocked(gridX: number, gridY: number, blocked: boolean = true) {
    if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) return;
    this.blockedTiles[gridY * this.gridWidth + gridX] = blocked ? 1 : 0;
  }

  public setRectBlocked(worldX: number, worldY: number, width: number, height: number, blocked: boolean = true) {
    const startGX = Math.max(0, Math.floor(worldX / TILE_SIZE));
    const endGX = Math.min(this.gridWidth - 1, Math.floor((worldX + width - 1) / TILE_SIZE));
    const startGY = Math.max(0, Math.floor(worldY / TILE_SIZE));
    const endGY = Math.min(this.gridHeight - 1, Math.floor((worldY + height - 1) / TILE_SIZE));

    for (let gy = startGY; gy <= endGY; gy++) {
      for (let gx = startGX; gx <= endGX; gx++) {
        this.blockedTiles[gy * this.gridWidth + gx] = blocked ? 1 : 0;
      }
    }
  }

  public isWalkable(gridX: number, gridY: number): boolean {
    if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) return false;
    return this.blockedTiles[gridY * this.gridWidth + gridX] === 0;
  }

  public isWorldWalkable(worldX: number, worldY: number): boolean {
    const gx = Math.floor(worldX / TILE_SIZE);
    const gy = Math.floor(worldY / TILE_SIZE);
    return this.isWalkable(gx, gy);
  }

  // Fast Line of Sight check
  public hasLineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
    let gx0 = Math.floor(x0 / TILE_SIZE);
    let gy0 = Math.floor(y0 / TILE_SIZE);
    const gx1 = Math.floor(x1 / TILE_SIZE);
    const gy1 = Math.floor(y1 / TILE_SIZE);

    const dx = Math.abs(gx1 - gx0);
    const dy = Math.abs(gy1 - gy0);
    const sx = gx0 < gx1 ? 1 : -1;
    const sy = gy0 < gy1 ? 1 : -1;
    let err = dx - dy;

    while (gx0 !== gx1 || gy0 !== gy1) {
      if (!this.isWalkable(gx0, gy0)) return false;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        gx0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        gy0 += sy;
      }
    }
    return this.isWalkable(gx1, gy1);
  }

  // A* Pathfinding from world (startX, startY) to (targetX, targetY)
  // Returns list of world waypoints [{x, y}]
  public findPath(startX: number, startY: number, targetX: number, targetY: number, maxIterations: number = 300): GridPoint[] {
    const startGX = Math.floor(startX / TILE_SIZE);
    const startGY = Math.floor(startY / TILE_SIZE);
    const targetGX = Math.floor(targetX / TILE_SIZE);
    const targetGY = Math.floor(targetY / TILE_SIZE);

    if (startGX === targetGX && startGY === targetGY) {
      return [{ x: targetX, y: targetY }];
    }

    // If target tile is completely blocked, find nearest walkable neighbor
    let endGX = targetGX;
    let endGY = targetGY;
    if (!this.isWalkable(endGX, endGY)) {
      const neighbors = [
        { x: endGX + 1, y: endGY },
        { x: endGX - 1, y: endGY },
        { x: endGX, y: endGY + 1 },
        { x: endGX, y: endGY - 1 },
      ];
      const valid = neighbors.find(n => this.isWalkable(n.x, n.y));
      if (valid) {
        endGX = valid.x;
        endGY = valid.y;
      } else {
        return []; // unreachable
      }
    }

    const openList: PathNode[] = [];
    const closedSet = new Uint8Array(this.gridWidth * this.gridHeight);

    const startNode: PathNode = {
      x: startGX,
      y: startGY,
      g: 0,
      h: Math.abs(endGX - startGX) + Math.abs(endGY - startGY),
      f: Math.abs(endGX - startGX) + Math.abs(endGY - startGY),
    };

    openList.push(startNode);

    let iterations = 0;
    let closestNode = startNode;
    let minH = startNode.h;

    const dirs = [
      { x: 1, y: 0, cost: 1 },
      { x: -1, y: 0, cost: 1 },
      { x: 0, y: 1, cost: 1 },
      { x: 0, y: -1, cost: 1 },
      // Optional slight diagonal movement with collision clearance
      { x: 1, y: 1, cost: 1.414 },
      { x: -1, y: 1, cost: 1.414 },
      { x: 1, y: -1, cost: 1.414 },
      { x: -1, y: -1, cost: 1.414 },
    ];

    while (openList.length > 0 && iterations < maxIterations) {
      iterations++;

      // Pick node with lowest f
      let bestIdx = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[bestIdx].f) {
          bestIdx = i;
        }
      }

      const current = openList.splice(bestIdx, 1)[0];
      const currentKey = current.y * this.gridWidth + current.x;
      closedSet[currentKey] = 1;

      // Track closest for fallback if timeout
      if (current.h < minH) {
        minH = current.h;
        closestNode = current;
      }

      // Reached goal!
      if (current.x === endGX && current.y === endGY) {
        return this.reconstructPath(current, targetX, targetY);
      }

      // Expand neighbors
      for (const d of dirs) {
        const nx = current.x + d.x;
        const ny = current.y + d.y;

        if (nx < 0 || nx >= this.gridWidth || ny < 0 || ny >= this.gridHeight) continue;
        if (closedSet[ny * this.gridWidth + nx] === 1) continue;
        if (!this.isWalkable(nx, ny)) continue;

        // Diagonal clearance check (prevent corner cutting through solid walls)
        if (d.x !== 0 && d.y !== 0) {
          if (!this.isWalkable(current.x + d.x, current.y) || !this.isWalkable(current.x, current.y + d.y)) {
            continue;
          }
        }

        const g = current.g + d.cost;
        const h = Math.abs(endGX - nx) + Math.abs(endGY - ny);
        const f = g + h;

        const existing = openList.find(n => n.x === nx && n.y === ny);
        if (existing) {
          if (g < existing.g) {
            existing.g = g;
            existing.f = f;
            existing.parent = current;
          }
        } else {
          openList.push({ x: nx, y: ny, g, h, f, parent: current });
        }
      }
    }

    // Return best path found if reached max iterations
    if (closestNode && closestNode !== startNode) {
      return this.reconstructPath(closestNode, targetX, targetY);
    }

    return [];
  }

  private reconstructPath(node: PathNode, targetX: number, targetY: number): GridPoint[] {
    const path: GridPoint[] = [];
    let curr: PathNode | undefined = node;

    while (curr && curr.parent) {
      path.unshift({
        x: curr.x * TILE_SIZE + TILE_SIZE / 2,
        y: curr.y * TILE_SIZE + TILE_SIZE / 2,
      });
      curr = curr.parent;
    }

    // Add exact final target position
    path.push({ x: targetX, y: targetY });
    return path;
  }
}
