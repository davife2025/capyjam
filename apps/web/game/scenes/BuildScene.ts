import Phaser from "phaser";
import { Track, TILE_SIZE, type TrackData } from "@capyjam/game-engine";
import type { TrackTile } from "@capyjam/types";

/**
 * BuildScene: renders a live preview of the track inside the editor.
 * Driven by external tile data passed via registry.
 * Lightweight — no physics, no karts, just a visual preview.
 */
export class BuildScene extends Phaser.Scene {
  private trackGroup!: Phaser.GameObjects.Group;
  private lastTileHash = "";

  constructor() { super({ key: "BuildScene" }); }

  create() {
    this.trackGroup = this.add.group();
    this.cameras.main.setBackgroundColor("#1a1a2e");

    // Pan + zoom
    this.input.on("wheel", (_p: unknown, _go: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main;
      const newZoom = Phaser.Math.Clamp(cam.zoom - dy * 0.001, 0.3, 2.5);
      cam.setZoom(newZoom);
    });

    let dragging = false;
    let lastX = 0, lastY = 0;

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (p.middleButtonDown()) { dragging = true; lastX = p.x; lastY = p.y; }
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!dragging) return;
      this.cameras.main.scrollX -= (p.x - lastX) / this.cameras.main.zoom;
      this.cameras.main.scrollY -= (p.y - lastY) / this.cameras.main.zoom;
      lastX = p.x; lastY = p.y;
    });
    this.input.on("pointerup", () => { dragging = false; });

    this.rebuildTrack();
  }

  update() {
    // Poll registry for track data changes
    const tiles = this.registry.get("previewTiles") as TrackTile[] | undefined;
    if (!tiles) return;

    const hash = tiles.length + "_" + (tiles[0]?.type ?? "");
    if (hash !== this.lastTileHash) {
      this.lastTileHash = hash;
      this.rebuildTrack();
    }
  }

  private rebuildTrack() {
    this.trackGroup.clear(true, true);

    const tiles  = this.registry.get("previewTiles") as TrackTile[] | undefined;
    if (!tiles) return;

    const W = this.registry.get("previewWidth") as number || 32;
    const H = this.registry.get("previewHeight") as number || 24;

    for (const tile of tiles) {
      const wx  = tile.x * TILE_SIZE + TILE_SIZE / 2;
      const wy  = tile.y * TILE_SIZE + TILE_SIZE / 2;
      let   key = `tile-${tile.type}`;
      if (!(key in this.textures.list)) key = "tile-grass";

      const img = this.add.image(wx, wy, key).setAngle(tile.rotation);
      this.trackGroup.add(img);
    }

    // Fit camera
    const totalW = W * TILE_SIZE;
    const totalH = H * TILE_SIZE;
    this.cameras.main.centerOn(totalW / 2, totalH / 2);
    this.cameras.main.setZoom(
      Math.min(
        this.scale.width  / totalW,
        this.scale.height / totalH
      ) * 0.9
    );
  }
}
