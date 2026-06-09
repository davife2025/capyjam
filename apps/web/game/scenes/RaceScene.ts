import Phaser from "phaser";
import { createDefaultTrack, Track, TILE_SIZE, distance } from "@capyjam/game-engine";
import { CapyKart } from "@capyjam/game-engine";
import { createAIDrivers, type AIDriver } from "@/game/ai/AIDriver";
import { CapySprite } from "@/game/objects/CapySprite";
import { ItemBox } from "@/game/objects/ItemBox";
import { RaceHUD } from "@/game/hud/RaceHUD";
import { v4 as uuid } from "uuid";
import type { SkinId, PowerUpType } from "@capyjam/types";
import type { Vec2 } from "@capyjam/game-engine";

const TOTAL_LAPS    = 3;
const AI_COUNT      = 4;
const CHECKPOINT_R  = 80; // pixels radius to trigger checkpoint
const FINISH_R      = 72;

interface Projectile {
  type: "banana" | "shell";
  sprite: Phaser.GameObjects.Image;
  x: number; y: number;
  angle: number;
  speed: number;
  ownerId: string;
  active: boolean;
}

export class RaceScene extends Phaser.Scene {
  // ── Core objects ───────────────────────────────────────────────────────
  private track!:         Track;
  private playerKart!:    CapyKart;
  private playerSprite!:  CapySprite;
  private aiDrivers:      AIDriver[] = [];
  private aiSprites:      Map<string, CapySprite> = new Map();
  private itemBoxes:      ItemBox[] = [];
  private projectiles:    Projectile[] = [];
  private hud!:           RaceHUD;

  // ── Input ───────────────────────────────────────────────────────────────
  private cursors!:       Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!:          { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private driftKey!:      Phaser.Input.Keyboard.Key;
  private useItemKey!:    Phaser.Input.Keyboard.Key;

  // ── State ───────────────────────────────────────────────────────────────
  private raceStarted  = false;
  private raceFinished = false;
  private raceStartTime = 0;
  private prevDrifting  = false;

  constructor() { super({ key: "RaceScene" }); }

  create() {
    // Build track
    const trackData  = createDefaultTrack();
    this.track       = new Track(trackData);

    this.buildTrackTiles();
    this.setupPlayer();
    this.setupAI();
    this.setupItemBoxes();
    this.setupInput();
    this.setupCamera();

    // HUD last (needs player kart)
    this.hud = new RaceHUD(this, this.playerKart, TOTAL_LAPS, 1 + AI_COUNT);
    this.hud.showCountdown(() => {
      this.raceStarted   = true;
      this.raceStartTime = this.time.now;
      this.playerKart.raceStartTime = this.raceStartTime;
      this.hud.setRaceStartTime(this.raceStartTime);
      for (const ai of this.aiDrivers) ai.kart.raceStartTime = this.raceStartTime;
    });

    // World bounds
    this.physics.world.setBounds(0, 0, this.track.widthPx, this.track.heightPx);
  }

  // ── Track ──────────────────────────────────────────────────────────────
  private buildTrackTiles() {
    for (const tile of this.track.data.tiles) {
      const wx = tile.x * TILE_SIZE + TILE_SIZE / 2;
      const wy = tile.y * TILE_SIZE + TILE_SIZE / 2;

      let key = `tile-${tile.type}`;
      if (!(key in this.textures.list)) key = "tile-grass";

      this.add.image(wx, wy, key)
        .setAngle(tile.rotation)
        .setDepth(0);
    }

    // Checkpoint visuals (faint)
    const checkpoints = this.track.getCheckpoints();
    checkpoints.forEach((cp, i) => {
      const vis = this.add.image(cp.x, cp.y, "checkpoint")
        .setAlpha(0.18).setDepth(1);
    });
  }

  // ── Player ─────────────────────────────────────────────────────────────
  private setupPlayer() {
    const starts = this.track.getStartPositions();
    const s      = starts[0];

    this.playerKart = new CapyKart({
      id:         uuid(),
      playerId:   uuid(),
      skin:       "capy-default" as SkinId,
      startX:     s.x,
      startY:     s.y,
      startAngle: s.angle,
    }, TOTAL_LAPS);

    this.playerSprite = new CapySprite(this, this.playerKart, true);
  }

  // ── AI ─────────────────────────────────────────────────────────────────
  private setupAI() {
    const starts    = this.track.getStartPositions();
    const waypoints = this.track.getCheckpoints() as Vec2[];
    const skins: SkinId[] = ["capy-racer","capy-pirate","capy-astronaut","capy-samurai"];
    const aiNames   = ["TurboNut 🤖","BananaBot 🍌","SlowPoke 🐢","ZoomZoom ⚡"];

    this.aiDrivers = createAIDrivers(
      waypoints,
      starts,
      skins,
      "medium",
      Math.min(AI_COUNT, starts.length - 1),
      TOTAL_LAPS
    );

    this.aiDrivers.forEach((ai, i) => {
      const sprite = new CapySprite(this, ai.kart, false, aiNames[i] ?? `AI-${i}`);
      this.aiSprites.set(ai.kart.id, sprite);
    });
  }

  // ── Item boxes ─────────────────────────────────────────────────────────
  private setupItemBoxes() {
    for (const pos of this.track.getItemBoxPositions()) {
      this.itemBoxes.push(new ItemBox(this, pos.x, pos.y));
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────
  private setupInput() {
    this.cursors    = this.input.keyboard!.createCursorKeys();
    this.wasd       = {
      up:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.driftKey   = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.useItemKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  // ── Camera ─────────────────────────────────────────────────────────────
  private setupCamera() {
    this.cameras.main
      .setBounds(0, 0, this.track.widthPx, this.track.heightPx)
      .startFollow(this.playerSprite.sprite, true, 0.08, 0.08)
      .setZoom(1.5);
  }

  // ── Update loop ────────────────────────────────────────────────────────
  update(_t: number, delta: number) {
    if (!this.raceStarted || this.raceFinished) return;

    const dt = Math.min(delta / 1000, 0.05); // cap at 50ms

    this.updatePlayer(dt);
    this.updateAI(dt);
    this.checkItemPickups();
    this.updateProjectiles(dt);
    this.checkCheckpoints();
    this.updatePositions();
    this.updateSprites();
    this.hud.update(
      [this.playerKart, ...this.aiDrivers.map(a => a.kart)],
      this.track.widthPx,
      this.track.heightPx
    );
  }

  private updatePlayer(dt: number) {
    const up    = this.cursors.up.isDown    || this.wasd.up.isDown;
    const down  = this.cursors.down.isDown  || this.wasd.down.isDown;
    const left  = this.cursors.left.isDown  || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const drift = this.driftKey.isDown;

    // Detect mini-turbo release
    if (this.prevDrifting && !drift && this.playerKart.state.driftCharge > 0.5) {
      this.playerSprite.showMiniTurbo();
    }
    this.prevDrifting = drift;

    this.playerKart.input = { up, down, left, right, drift };

    // Use item
    if (Phaser.Input.Keyboard.JustDown(this.useItemKey)) {
      const type = this.playerKart.usePowerUp();
      if (type) this.fireItem(type, this.playerKart);
    }

    const surface = this.track.getSurfaceAt(
      this.playerKart.state.position.x,
      this.playerKart.state.position.y
    );
    this.playerKart.update(dt, surface);

    // Clamp to world
    this.playerKart.state.position.x = Phaser.Math.Clamp(this.playerKart.state.position.x, 0, this.track.widthPx);
    this.playerKart.state.position.y = Phaser.Math.Clamp(this.playerKart.state.position.y, 0, this.track.heightPx);
  }

  private updateAI(dt: number) {
    for (const ai of this.aiDrivers) {
      if (ai.kart.isFinished()) continue;
      const surface = this.track.getSurfaceAt(
        ai.kart.state.position.x,
        ai.kart.state.position.y
      );
      ai.update(dt, surface);
      ai.kart.state.position.x = Phaser.Math.Clamp(ai.kart.state.position.x, 0, this.track.widthPx);
      ai.kart.state.position.y = Phaser.Math.Clamp(ai.kart.state.position.y, 0, this.track.heightPx);
    }
  }

  // ── Item pickup ─────────────────────────────────────────────────────────
  private checkItemPickups() {
    const allKarts = [this.playerKart, ...this.aiDrivers.map(a => a.kart)];
    for (const box of this.itemBoxes) {
      for (const kart of allKarts) {
        if (kart.heldPowerUp) continue;
        const pu = box.checkPickup(kart.state.position.x, kart.state.position.y);
        if (pu) kart.pickUpPowerUp(pu);
      }
    }
  }

  // ── Projectile fire + update ────────────────────────────────────────────
  private fireItem(type: PowerUpType, kart: CapyKart) {
    if (type === "banana" || type === "shell") {
      const textureKey = type === "banana" ? "proj-banana" : "proj-shell";
      const speed      = type === "shell"  ? 600 : 0;
      const sprite     = this.add.image(
        kart.state.position.x,
        kart.state.position.y,
        textureKey
      ).setDepth(8);

      this.projectiles.push({
        type,
        sprite,
        x: kart.state.position.x,
        y: kart.state.position.y,
        angle: type === "shell" ? kart.state.angle : 0,
        speed,
        ownerId: kart.id,
        active: true,
      });
    }
  }

  private updateProjectiles(dt: number) {
    const allKarts = [this.playerKart, ...this.aiDrivers.map(a => a.kart)];

    for (const proj of this.projectiles) {
      if (!proj.active) continue;

      proj.x += Math.cos(proj.angle) * proj.speed * dt;
      proj.y += Math.sin(proj.angle) * proj.speed * dt;
      proj.sprite.setPosition(proj.x, proj.y);

      // Check hit
      for (const kart of allKarts) {
        if (kart.id === proj.ownerId) continue;
        if (distance(kart.state.position, { x: proj.x, y: proj.y }) < 30) {
          kart.hitByItem();
          proj.active = false;
          proj.sprite.destroy();

          // Hit flash
          const flash = this.add.circle(proj.x, proj.y, 20, 0xFF4444, 0.9).setDepth(20);
          this.tweens.add({ targets: flash, scale: 3, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
        }
      }

      // Shell OOB
      if (proj.type === "shell" && (proj.x < 0 || proj.x > this.track.widthPx || proj.y < 0 || proj.y > this.track.heightPx)) {
        proj.active = false;
        proj.sprite.destroy();
      }
    }

    // Prune dead projectiles
    this.projectiles = this.projectiles.filter(p => p.active);
  }

  // ── Checkpoint + lap logic ──────────────────────────────────────────────
  private checkCheckpoints() {
    const allKarts      = [this.playerKart, ...this.aiDrivers.map(a => a.kart)];
    const checkpoints   = this.track.getCheckpoints();
    const finishLine    = checkpoints[0]; // first checkpoint is after finish line

    for (const kart of allKarts) {
      if (kart.isFinished()) continue;
      const pos = kart.state.position;

      // Check each checkpoint
      checkpoints.forEach((cp, i) => {
        if (i === 0) return; // skip finish-as-checkpoint
        if (distance(pos, cp) < CHECKPOINT_R) {
          kart.passCheckpoint(i, checkpoints.length - 1, this.time.now);
        }
      });

      // Check finish line (checkpoint index 0)
      if (distance(pos, finishLine) < FINISH_R) {
        const finished = kart.completeLap(this.time.now);
        if (kart.currentLap > 0 && kart.currentLap <= TOTAL_LAPS && kart === this.playerKart) {
          this.hud.showLapFlash(kart.currentLap);
        }
        if (finished) this.onKartFinished(kart);
      }
    }
  }

  private onKartFinished(kart: CapyKart) {
    kart.racePosition = this.aiDrivers.filter(a => a.kart.isFinished()).length + 1;
    if (kart === this.playerKart) {
      this.raceFinished = true;
      const totalTime   = kart.getTotalRaceTime(this.time.now);
      this.hud.showRaceFinish(kart.racePosition, totalTime);
    }
  }

  // ── Race position sorting ───────────────────────────────────────────────
  private updatePositions() {
    const allKarts = [this.playerKart, ...this.aiDrivers.map(a => a.kart)];
    const checkpoints = this.track.getCheckpoints();

    // Score = laps*1000 + checkpointsPassed + proximity to next checkpoint (normalised)
    for (const kart of allKarts) {
      const nextCp = checkpoints[(kart.lapData.checkpointsPassed.size) % checkpoints.length];
      const dist   = nextCp ? distance(kart.state.position, nextCp) : 0;
      kart.progressDistance = kart.currentLap * 10000
        + kart.lapData.checkpointsPassed.size * 1000
        - dist * 0.01;
    }

    const sorted = [...allKarts].sort((a, b) => b.progressDistance - a.progressDistance);
    sorted.forEach((k, i) => { k.racePosition = i + 1; });
  }

  // ── Visual sync ─────────────────────────────────────────────────────────
  private updateSprites() {
    this.playerSprite.update();
    for (const [id, sprite] of this.aiSprites) {
      sprite.update();
    }
  }
}
