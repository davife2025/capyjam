import type { TrackTile, TrackSchema } from "@capyjam/types";
import type { SurfaceType, Vec2 } from "./Physics";
import type { z } from "zod";

export type TrackData = z.infer<typeof TrackSchema>;

export const TILE_SIZE = 64; // pixels

export class Track {
  data: TrackData;
  private tileMap: Map<string, TrackTile> = new Map();

  constructor(data: TrackData) {
    this.data = data;
    this.buildTileMap();
  }

  private buildTileMap(): void {
    for (const tile of this.data.tiles) {
      this.tileMap.set(`${tile.x},${tile.y}`, tile);
    }
  }

  getTileAt(worldX: number, worldY: number): TrackTile | null {
    const tx = Math.floor(worldX / TILE_SIZE);
    const ty = Math.floor(worldY / TILE_SIZE);
    return this.tileMap.get(`${tx},${ty}`) ?? null;
  }

  getSurfaceAt(worldX: number, worldY: number): SurfaceType {
    const tile = this.getTileAt(worldX, worldY);
    if (!tile) return "grass";
    switch (tile.type) {
      case "road":       return "road";
      case "dirt":       return "dirt";
      case "grass":      return "grass";
      case "boost":      return "boost";
      case "mud":        return "mud";
      default:           return "road";
    }
  }

  getCheckpoints(): Vec2[] {
    return this.data.checkpoints as Vec2[];
  }

  getStartPositions(): Array<Vec2 & { angle: number }> {
    return this.data.startPositions as Array<Vec2 & { angle: number }>;
  }

  getItemBoxPositions(): Vec2[] {
    return this.data.tiles
      .filter(t => t.type === "item-box")
      .map(t => ({ x: t.x * TILE_SIZE + TILE_SIZE / 2, y: t.y * TILE_SIZE + TILE_SIZE / 2 }));
  }

  get widthPx(): number { return this.data.width * TILE_SIZE; }
  get heightPx(): number { return this.data.height * TILE_SIZE; }
}

// ── Built-in track: Capy Jungle Circuit ──────────────────────────────────────

export function createDefaultTrack(): TrackData {
  const tiles: TrackTile[] = [];
  const W = 32, H = 20;

  // Outer loop road tiles (rectangle with corners)
  for (let x = 2; x <= 29; x++) {
    tiles.push({ x, y: 2, type: "road", rotation: 0 });
    tiles.push({ x, y: 17, type: "road", rotation: 0 });
  }
  for (let y = 3; y <= 16; y++) {
    tiles.push({ x: 2, y, type: "road", rotation: 0 });
    tiles.push({ x: 29, y, type: "road", rotation: 0 });
  }

  // Inner loop with shortcuts
  for (let x = 8; x <= 23; x++) {
    tiles.push({ x, y: 6, type: "road", rotation: 0 });
    tiles.push({ x, y: 13, type: "road", rotation: 0 });
  }
  for (let y = 7; y <= 12; y++) {
    tiles.push({ x: 8,  y, type: "road", rotation: 0 });
    tiles.push({ x: 23, y, type: "road", rotation: 0 });
  }

  // Boost pads
  tiles.push({ x: 5,  y: 2,  type: "boost", rotation: 0 });
  tiles.push({ x: 15, y: 17, type: "boost", rotation: 0 });
  tiles.push({ x: 26, y: 9,  type: "boost", rotation: 0 });

  // Mud patches
  tiles.push({ x: 20, y: 2,  type: "mud", rotation: 0 });
  tiles.push({ x: 10, y: 17, type: "mud", rotation: 0 });

  // Dirt shortcuts
  tiles.push({ x: 5,  y: 9,  type: "dirt", rotation: 0 });
  tiles.push({ x: 5,  y: 10, type: "dirt", rotation: 0 });
  tiles.push({ x: 26, y: 4,  type: "dirt", rotation: 0 });

  // Item boxes
  tiles.push({ x: 12, y: 2,  type: "item-box", rotation: 0 });
  tiles.push({ x: 20, y: 6,  type: "item-box", rotation: 0 });
  tiles.push({ x: 8,  y: 13, type: "item-box", rotation: 0 });
  tiles.push({ x: 26, y: 14, type: "item-box", rotation: 0 });

  // Finish line + start
  tiles.push({ x: 15, y: 2, type: "finish", rotation: 0 });
  tiles.push({ x: 14, y: 2, type: "start",  rotation: 0 });

  // Fill rest with grass
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      if (!tiles.find(t => t.x === x && t.y === y)) {
        tiles.push({ x, y, type: "grass", rotation: 0 });
      }
    }
  }

  return {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Capy Jungle Circuit",
    authorId: null,
    tiles,
    width: W,
    height: H,
    checkpoints: [
      { x: 15 * TILE_SIZE, y: 4 * TILE_SIZE },
      { x: 29 * TILE_SIZE, y: 9 * TILE_SIZE },
      { x: 15 * TILE_SIZE, y: 15 * TILE_SIZE },
      { x: 2  * TILE_SIZE, y: 9 * TILE_SIZE },
    ],
    startPositions: [
      { x: 14 * TILE_SIZE, y: 2 * TILE_SIZE + 32, angle: 0 },
      { x: 14 * TILE_SIZE + 80, y: 2 * TILE_SIZE + 32, angle: 0 },
      { x: 14 * TILE_SIZE, y: 2 * TILE_SIZE + 96, angle: 0 },
      { x: 14 * TILE_SIZE + 80, y: 2 * TILE_SIZE + 96, angle: 0 },
      { x: 14 * TILE_SIZE, y: 2 * TILE_SIZE + 160, angle: 0 },
      { x: 14 * TILE_SIZE + 80, y: 2 * TILE_SIZE + 160, angle: 0 },
      { x: 14 * TILE_SIZE, y: 2 * TILE_SIZE + 224, angle: 0 },
      { x: 14 * TILE_SIZE + 80, y: 2 * TILE_SIZE + 224, angle: 0 },
    ],
    published: true,
    plays: 0,
    rating: 0,
    createdAt: new Date(),
  };
}
