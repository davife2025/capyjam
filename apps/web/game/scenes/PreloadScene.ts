import Phaser from "phaser";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" });
  }

  preload() {
    // Progress bar
    const { width, height } = this.scale;
    const bar = this.add.graphics();
    const box = this.add.graphics();

    box.fillStyle(0x222222);
    box.fillRect(width / 2 - 160, height / 2 - 15, 320, 30);

    this.load.on("progress", (value: number) => {
      bar.clear();
      bar.fillStyle(0x7F77DD);
      bar.fillRect(width / 2 - 158, height / 2 - 13, 316 * value, 26);
    });

    this.load.on("complete", () => {
      bar.destroy();
      box.destroy();
    });

    // Load assets — in session 2 these will be real sprites
    // For now we generate them procedurally
    this.generateCapyTextures();
  }

  private generateCapyTextures() {
    // Generate capy kart sprite programmatically (placeholder until art assets land)
    const skins = ["capy-default", "capy-racer", "capy-pirate", "capy-astronaut", "capy-samurai"];
    const colors: Record<string, number> = {
      "capy-default":    0xC4965A,
      "capy-racer":      0xE24B4A,
      "capy-pirate":     0x534AB7,
      "capy-astronaut":  0x378ADD,
      "capy-samurai":    0x1D9E75,
    };

    for (const skin of skins) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const color = colors[skin] ?? 0xC4965A;

      // Kart body
      g.fillStyle(color);
      g.fillRoundedRect(4, 8, 24, 16, 4);

      // Capy head
      g.fillStyle(0xD4A96A);
      g.fillCircle(26, 12, 10);

      // Eye
      g.fillStyle(0x2C2C2A);
      g.fillCircle(29, 10, 2);

      // Nose
      g.fillStyle(0xE8A87C);
      g.fillCircle(32, 13, 2);

      // Wheels
      g.fillStyle(0x2C2C2A);
      g.fillCircle(8, 8, 5);
      g.fillCircle(8, 24, 5);
      g.fillCircle(24, 8, 5);
      g.fillCircle(24, 24, 5);

      // Wheel hubs
      g.fillStyle(0x888780);
      g.fillCircle(8, 8, 2);
      g.fillCircle(8, 24, 2);
      g.fillCircle(24, 8, 2);
      g.fillCircle(24, 24, 2);

      g.generateTexture(skin, 44, 32);
      g.destroy();
    }

    // Track tile textures
    const tileTypes: Record<string, number> = {
      "tile-road":  0x4A4A4A,
      "tile-grass": 0x3A7D44,
      "tile-dirt":  0x8B5A2B,
      "tile-boost": 0xF9CB42,
      "tile-mud":   0x5C3A1E,
      "tile-finish": 0xFFFFFF,
    };

    for (const [key, color] of Object.entries(tileTypes)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color);
      g.fillRect(0, 0, 64, 64);

      if (key === "tile-road") {
        // Road markings
        g.fillStyle(0x666666);
        g.fillRect(0, 0, 64, 2);
        g.fillRect(0, 62, 64, 2);
      }
      if (key === "tile-boost") {
        g.fillStyle(0xEF9F27);
        g.fillTriangle(12, 52, 32, 12, 52, 52);
      }
      if (key === "tile-finish") {
        // Checkerboard
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if ((r + c) % 2 === 0) {
              g.fillStyle(0x000000);
              g.fillRect(c * 16, r * 16, 16, 16);
            }
          }
        }
      }

      g.generateTexture(key, 64, 64);
      g.destroy();
    }

    // Item box texture
    const ib = this.make.graphics({ x: 0, y: 0, add: false });
    ib.fillStyle(0xF9CB42);
    ib.fillRect(4, 4, 56, 56);
    ib.fillStyle(0xFFFFFF);
    ib.fillRect(8, 8, 48, 48);
    ib.fillStyle(0xF9CB42);
    ib.fillCircle(32, 32, 16);
    ib.fillStyle(0xFFFFFF);
    ib.fillRect(30, 16, 4, 32);
    ib.fillRect(20, 26, 24, 4);
    ib.generateTexture("item-box", 64, 64);
    ib.destroy();
  }

  create() {
    this.scene.start("RaceScene");
  }
}
