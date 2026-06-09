import Phaser from "phaser";

const CAPY_SKINS: Record<string, number> = {
  "capy-default":    0xC4965A,
  "capy-racer":      0xE24B4A,
  "capy-pirate":     0x534AB7,
  "capy-astronaut":  0x378ADD,
  "capy-samurai":    0x1D9E75,
};

export class PreloadScene extends Phaser.Scene {
  constructor() { super({ key: "PreloadScene" }); }

  preload() {
    const { width: W, height: H } = this.scale;

    // Progress bar UI
    const box = this.add.graphics();
    box.fillStyle(0x1a1a2e); box.fillRect(0, 0, W, H);
    box.fillStyle(0x2a2a3e); box.fillRoundedRect(W/2 - 200, H/2 - 20, 400, 40, 8);

    const bar = this.add.graphics();
    this.add.text(W/2, H/2 - 60, "🐾", { fontSize: "48px" }).setOrigin(0.5);
    this.add.text(W/2, H/2 + 40, "Loading race...", {
      fontSize: "16px", color: "#888888", fontFamily: "system-ui",
    }).setOrigin(0.5);

    this.load.on("progress", (v: number) => {
      bar.clear();
      bar.fillStyle(0x7F77DD);
      bar.fillRoundedRect(W/2 - 198, H/2 - 18, 396 * v, 36, 6);
    });
  }

  create() {
    this.generateTextures();
    this.scene.start("RaceScene");
  }

  private generateTextures() {
    // ── Capy kart sprites ──────────────────────────────────────────────────
    for (const [skin, bodyColor] of Object.entries(CAPY_SKINS)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });

      // Kart shadow base
      g.fillStyle(0x222222, 0.4);
      g.fillEllipse(22, 20, 44, 22);

      // Kart body
      g.fillStyle(bodyColor);
      g.fillRoundedRect(5, 10, 30, 18, 5);

      // Kart cockpit windshield
      g.fillStyle(0x7FDDFF, 0.7);
      g.fillRoundedRect(16, 11, 12, 8, 3);

      // Capy head (right side = front)
      g.fillStyle(0xD4A96A);
      g.fillCircle(33, 16, 9);
      // Ear
      g.fillStyle(0xC4905A);
      g.fillEllipse(37, 9, 6, 7);
      // Eye
      g.fillStyle(0x1a1a1a);
      g.fillCircle(36, 14, 2);
      g.fillStyle(0xFFFFFF);
      g.fillCircle(37, 13, 0.8);
      // Nose
      g.fillStyle(0xE8A87C);
      g.fillEllipse(40, 17, 5, 4);
      // Nostrils
      g.fillStyle(0xAA7050);
      g.fillCircle(39, 17, 1); g.fillCircle(41, 17, 1);

      // Wheels x4
      const wheels = [[6,9],[6,23],[25,9],[25,23]];
      for (const [wx, wy] of wheels) {
        g.fillStyle(0x1a1a1a); g.fillCircle(wx, wy, 6);
        g.fillStyle(0x555555); g.fillCircle(wx, wy, 3.5);
        g.fillStyle(0x888888); g.fillCircle(wx, wy, 1.5);
      }

      // Exhaust pipe
      g.fillStyle(0x555555);
      g.fillRect(3, 15, 4, 3);

      g.generateTexture(skin, 48, 34);
      g.destroy();
    }

    // ── Track tiles ────────────────────────────────────────────────────────
    const tiles: Array<[string, () => void]> = [
      ["tile-road", () => {
        const g = this.make.graphics({ x:0,y:0,add:false });
        g.fillStyle(0x3E3E3E); g.fillRect(0,0,64,64);
        // Road lines
        g.lineStyle(1, 0x555555, 0.4);
        g.strokeRect(0,0,64,64);
        // Center dashes
        g.fillStyle(0x666666, 0.3);
        g.fillRect(30,0,4,16); g.fillRect(30,24,4,16); g.fillRect(30,48,4,16);
        g.generateTexture("tile-road",64,64); g.destroy();
      }],
      ["tile-grass", () => {
        const g = this.make.graphics({ x:0,y:0,add:false });
        g.fillStyle(0x2E7D32); g.fillRect(0,0,64,64);
        // Grass texture dots
        g.fillStyle(0x388E3C,0.6);
        for (let i=0;i<12;i++) {
          const px = (i*17+7)%64, py = (i*13+5)%64;
          g.fillCircle(px,py,3+i%3);
        }
        g.generateTexture("tile-grass",64,64); g.destroy();
      }],
      ["tile-dirt", () => {
        const g = this.make.graphics({ x:0,y:0,add:false });
        g.fillStyle(0x8B5A2B); g.fillRect(0,0,64,64);
        g.fillStyle(0x9C6535,0.5);
        for (let i=0;i<8;i++) g.fillCircle((i*19+10)%64,(i*23+8)%64,4+i%4);
        g.generateTexture("tile-dirt",64,64); g.destroy();
      }],
      ["tile-boost", () => {
        const g = this.make.graphics({ x:0,y:0,add:false });
        g.fillStyle(0xF9CB42); g.fillRect(0,0,64,64);
        g.fillStyle(0xEF9F27);
        // Arrow chevrons
        for (let r=0;r<2;r++) {
          const oy = r*26+4;
          g.fillTriangle(10,oy+22, 32,oy+4, 54,oy+22, 32,oy+14, 10,oy+22);
          g.fillStyle(0xFFD700);
          g.fillTriangle(10,oy+22, 32,oy+4, 54,oy+22);
          g.fillStyle(0xEF9F27);
        }
        g.generateTexture("tile-boost",64,64); g.destroy();
      }],
      ["tile-mud", () => {
        const g = this.make.graphics({ x:0,y:0,add:false });
        g.fillStyle(0x4A2E1A); g.fillRect(0,0,64,64);
        g.fillStyle(0x5C3A1E,0.7);
        for (let i=0;i<6;i++) g.fillEllipse((i*22+6)%64,(i*18+4)%64,14+i%8,10+i%6);
        g.generateTexture("tile-mud",64,64); g.destroy();
      }],
      ["tile-finish", () => {
        const g = this.make.graphics({ x:0,y:0,add:false });
        // Checkerboard
        for (let r=0;r<4;r++) for (let c=0;c<4;c++) {
          g.fillStyle((r+c)%2===0 ? 0xFFFFFF : 0x000000);
          g.fillRect(c*16,r*16,16,16);
        }
        g.generateTexture("tile-finish",64,64); g.destroy();
      }],
      ["tile-start", () => {
        const g = this.make.graphics({ x:0,y:0,add:false });
        g.fillStyle(0x3E3E3E); g.fillRect(0,0,64,64);
        g.lineStyle(3,0xF9CB42,0.8); g.strokeRect(2,2,60,60);
        g.fillStyle(0xF9CB42,0.15); g.fillRect(2,2,60,60);
        g.generateTexture("tile-start",64,64); g.destroy();
      }],
    ];

    for (const [, fn] of tiles) fn();

    // ── Item box ───────────────────────────────────────────────────────────
    const ib = this.make.graphics({ x:0,y:0,add:false });
    ib.fillStyle(0x222222,0.5); ib.fillEllipse(34,38,56,18);
    ib.fillStyle(0x000000); ib.fillRoundedRect(4,4,56,56,8);
    ib.fillStyle(0xFFD700); ib.fillRoundedRect(6,6,52,52,7);
    ib.fillStyle(0xFFFFFF); ib.fillRoundedRect(10,10,44,44,5);
    ib.fillStyle(0xFFD700); ib.fillCircle(32,32,16);
    ib.fillStyle(0xFFFFFF); ib.fillRect(30,20,4,24); ib.fillRect(22,28,20,4);
    ib.generateTexture("item-box",64,64); ib.destroy();

    // Item box glow
    const gl = this.make.graphics({ x:0,y:0,add:false });
    gl.fillStyle(0xFFD700,0.6); gl.fillCircle(32,32,32);
    gl.generateTexture("item-box-glow",64,64); gl.destroy();

    // ── Checkpoint marker ──────────────────────────────────────────────────
    const cp = this.make.graphics({ x:0,y:0,add:false });
    cp.lineStyle(3,0x7FDDFF,0.7);
    cp.strokeRect(0,0,64,128);
    cp.fillStyle(0x7FDDFF,0.15); cp.fillRect(0,0,64,128);
    cp.generateTexture("checkpoint",64,128); cp.destroy();

    // ── Projectile textures ────────────────────────────────────────────────
    const banana = this.make.graphics({ x:0,y:0,add:false });
    banana.fillStyle(0xFFD700); banana.fillEllipse(12,12,20,12);
    banana.lineStyle(2,0xCCA000); banana.strokeEllipse(12,12,20,12);
    banana.generateTexture("proj-banana",24,24); banana.destroy();

    const shell = this.make.graphics({ x:0,y:0,add:false });
    shell.fillStyle(0x5DCAA5); shell.fillCircle(12,12,10);
    shell.fillStyle(0x3AA885); shell.fillCircle(12,12,6);
    shell.generateTexture("proj-shell",24,24); shell.destroy();
  }
}
