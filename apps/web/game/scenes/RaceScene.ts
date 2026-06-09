import Phaser from "phaser";
import { createDefaultTrack, Track, TILE_SIZE } from "@capyjam/game-engine";
import { CapyKart } from "@capyjam/game-engine";
import { v4 as uuid } from "uuid";
import type { SkinId } from "@capyjam/types";

export class RaceScene extends Phaser.Scene {
  // Core
  private track!: Track;
  private playerKart!: CapyKart;
  private kartSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private tileLayer!: Phaser.GameObjects.Group;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private driftKey!: Phaser.Input.Keyboard.Key;

  // HUD
  private hudLap!: Phaser.GameObjects.Text;
  private hudSpeed!: Phaser.GameObjects.Text;
  private hudTime!: Phaser.GameObjects.Text;
  private hudPowerup!: Phaser.GameObjects.Text;

  // State
  private raceStarted = false;
  private raceStartTime = 0;

  constructor() {
    super({ key: "RaceScene" });
  }

  create() {
    const trackData = createDefaultTrack();
    this.track = new Track(trackData);

    this.buildTrackVisuals();
    this.setupPlayer();
    this.setupCamera();
    this.setupInput();
    this.setupHUD();
    this.setupItemBoxes();

    // Start race after brief countdown
    this.time.delayedCall(1000, () => {
      this.raceStarted = true;
      this.raceStartTime = this.time.now;
      this.playerKart.raceStartTime = this.raceStartTime;
    });

    // Countdown text
    this.showCountdown();
  }

  private buildTrackVisuals() {
    this.tileLayer = this.add.group();

    for (const tile of this.track.data.tiles) {
      const worldX = tile.x * TILE_SIZE + TILE_SIZE / 2;
      const worldY = tile.y * TILE_SIZE + TILE_SIZE / 2;

      const textureKey = tile.type === "item-box"
        ? "tile-road"    // item boxes drawn separately
        : `tile-${tile.type}` in this.textures.list
          ? `tile-${tile.type}`
          : "tile-grass";

      const img = this.add.image(worldX, worldY, textureKey);
      img.setAngle(tile.rotation);
      this.tileLayer.add(img);
    }
  }

  private setupItemBoxes() {
    const positions = this.track.getItemBoxPositions();
    for (const pos of positions) {
      const box = this.add.image(pos.x, pos.y, "item-box");
      box.setDepth(1);
      // Floating animation
      this.tweens.add({
        targets: box,
        y: pos.y - 6,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  private setupPlayer() {
    const startPositions = this.track.getStartPositions();
    const start = startPositions[0];
    const playerId = uuid();

    this.playerKart = new CapyKart({
      id: uuid(),
      playerId,
      skin: "capy-default" as SkinId,
      startX: start.x,
      startY: start.y,
      startAngle: start.angle,
    }, this.track.data.totalLaps ?? 3);

    const sprite = this.add.image(start.x, start.y, "capy-default");
    sprite.setDepth(10);
    sprite.setOrigin(0.5, 0.5);
    this.kartSprites.set(this.playerKart.id, sprite);
  }

  private setupCamera() {
    this.cameras.main.setBounds(0, 0, this.track.widthPx, this.track.heightPx);
    const sprite = this.kartSprites.get(this.playerKart.id)!;
    this.cameras.main.startFollow(sprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.4);
  }

  private setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.driftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
  }

  private setupHUD() {
    const cam = this.cameras.main;
    const hudCam = this.cameras.add(0, 0, cam.width, cam.height);
    hudCam.setScroll(0, 0);

    // Create HUD on default camera (scrollFixed)
    const style = { fontSize: "18px", color: "#ffffff", stroke: "#000000", strokeThickness: 4 };
    this.hudLap   = this.add.text(20, 20, "Lap 1/3", style).setScrollFactor(0).setDepth(100);
    this.hudSpeed = this.add.text(20, 50, "0 km/h",  style).setScrollFactor(0).setDepth(100);
    this.hudTime  = this.add.text(20, 80, "0:00.000", { ...style, fontSize: "16px" }).setScrollFactor(0).setDepth(100);
    this.hudPowerup = this.add.text(20, 120, "", { ...style, fontSize: "24px" }).setScrollFactor(0).setDepth(100);
  }

  private showCountdown() {
    const { width, height } = this.scale;
    const style = {
      fontSize: "96px",
      color: "#F9CB42",
      stroke: "#000000",
      strokeThickness: 8,
      fontStyle: "bold",
    };

    const text = this.add.text(width / 2, height / 2, "3", style)
      .setScrollFactor(0)
      .setDepth(200)
      .setOrigin(0.5);

    let count = 3;
    const tick = () => {
      count--;
      if (count > 0) {
        text.setText(String(count));
        this.time.delayedCall(400, tick);
      } else {
        text.setText("GO! 🐾");
        this.time.delayedCall(600, () => text.destroy());
      }
    };
    this.time.delayedCall(400, tick);
  }

  update(_time: number, delta: number) {
    if (!this.raceStarted) return;

    const dt = delta / 1000;

    // Gather input
    const up    = this.cursors.up.isDown    || this.wasd.up.isDown;
    const down  = this.cursors.down.isDown  || this.wasd.down.isDown;
    const left  = this.cursors.left.isDown  || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const drift = this.driftKey.isDown;

    this.playerKart.input = { up, down, left, right, drift };

    // Get surface type at kart position
    const { x, y } = this.playerKart.state.position;
    const surface = this.track.getSurfaceAt(x, y);
    this.playerKart.update(dt, surface);

    // Clamp to track bounds
    this.playerKart.state.position.x = Phaser.Math.Clamp(
      this.playerKart.state.position.x, 0, this.track.widthPx
    );
    this.playerKart.state.position.y = Phaser.Math.Clamp(
      this.playerKart.state.position.y, 0, this.track.heightPx
    );

    // Update sprite
    const sprite = this.kartSprites.get(this.playerKart.id)!;
    sprite.setPosition(this.playerKart.state.position.x, this.playerKart.state.position.y);
    sprite.setAngle(Phaser.Math.RadToDeg(this.playerKart.state.angle));

    // Drift tint
    sprite.setTint(this.playerKart.state.isDrifting ? 0xF9CB42 : 0xFFFFFF);

    // Update HUD
    this.updateHUD();
  }

  private updateHUD() {
    const kph = Math.abs(Math.round(this.playerKart.state.speed * 0.1));
    this.hudSpeed.setText(`${kph} km/h`);
    this.hudLap.setText(`Lap ${this.playerKart.currentLap + 1}/${this.track.data.totalLaps ?? 3}`);

    const elapsed = this.time.now - this.raceStartTime;
    const m = Math.floor(elapsed / 60000);
    const s = Math.floor((elapsed % 60000) / 1000);
    const ms = elapsed % 1000;
    this.hudTime.setText(`${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`);

    if (this.playerKart.heldPowerUp) {
      const display = this.getpowerUpEmoji(this.playerKart.heldPowerUp);
      this.hudPowerup.setText(`[Space] ${display}`);
    } else {
      this.hudPowerup.setText("");
    }
  }

  private getpowerUpEmoji(type: string): string {
    const map: Record<string, string> = {
      "speed-boost": "⚡",
      "banana": "🍌",
      "shell": "🐚",
      "star": "⭐",
      "mud-splash": "💦",
      "nitro": "🔥",
    };
    return map[type] ?? "?";
  }
}
