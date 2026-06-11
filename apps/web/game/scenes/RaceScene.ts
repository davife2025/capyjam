import Phaser from "phaser";
import { createDefaultTrack, Track, TILE_SIZE, distance } from "@capyjam/game-engine";
import { CapyKart } from "@capyjam/game-engine";
import { createAIDrivers, type AIDriver } from "@/game/ai/AIDriver";
import { CapySprite } from "@/game/objects/CapySprite";
import { ItemBox } from "@/game/objects/ItemBox";
import { RaceHUD } from "@/game/hud/RaceHUD";
import { GhostCar } from "@/game/net/GhostCar";
import { NetManager } from "@/game/net/NetManager";
import { getSoundManager, type SoundManager } from "@/game/audio/SoundManager";
import { ParticleManager } from "@/game/fx/ParticleManager";
import { TouchControls } from "@/game/input/TouchControls";
import { ReplayRecorder } from "@/game/replay/ReplayRecorder";
import { ReplayPlayer } from "@/game/replay/ReplayPlayer";
import { GhostSprite } from "@/game/replay/GhostSprite";
import { saveReplayLocally, getBestLocalReplay, loadReplayLocally } from "@/game/replay/ReplayStorage";
import { v4 as uuid } from "uuid";
import type { SkinId, PowerUpType, Player } from "@capyjam/types";
import type { Vec2 } from "@capyjam/game-engine";

const TOTAL_LAPS   = 3;
const AI_COUNT     = 4;
const CHECKPOINT_R = 80;
const FINISH_R     = 72;
const NET_SEND_HZ  = 20;

interface Projectile {
  type:    "banana" | "shell";
  sprite:  Phaser.GameObjects.Image;
  x: number; y: number;
  angle:   number;
  speed:   number;
  ownerId: string;
  active:  boolean;
}

export class RaceScene extends Phaser.Scene {
  // ── Core ────────────────────────────────────────────────────────────────
  private track!:        Track;
  private playerKart!:   CapyKart;
  private playerSprite!: CapySprite;
  private aiDrivers:     AIDriver[]                       = [];
  private aiSprites:     Map<string, CapySprite>          = new Map();
  private ghostCars:     Map<string, GhostCar>            = new Map();
  private itemBoxes:     ItemBox[]                        = [];
  private projectiles:   Projectile[]                     = [];
  private hud!:          RaceHUD;

  // ── Networking ──────────────────────────────────────────────────────────
  private net:           NetManager | null = null;
  private isMultiplayer  = false;
  private roomId:        string | undefined;
  private forceGhostId:  string | undefined;
  private netSendTimer   = 0;

  // ── Input ───────────────────────────────────────────────────────────────
  private cursors!:      Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!:         { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private driftKey!:     Phaser.Input.Keyboard.Key;
  private useItemKey!:   Phaser.Input.Keyboard.Key;
  private chatKey!:      Phaser.Input.Keyboard.Key;

  // ── State ───────────────────────────────────────────────────────────────
  private raceStarted   = false;
  private raceFinished  = false;
  private raceStartTime = 0;
  private prevDrifting  = false;

  // ── Polish: audio, fx, touch ──────────────────────────────────────────────
  private sound!:        SoundManager;
  private fx!:           ParticleManager;
  private touch!:        TouchControls;
  private muteIcon!:     Phaser.GameObjects.Text;

  // ── Replay system ────────────────────────────────────────────────────────
  private recorder!:     ReplayRecorder;
  private ghostPlayer:   ReplayPlayer | null = null;
  private ghostSprite:   GhostSprite  | null = null;
  private ghostRaceMode  = false; // racing against best lap

  // ── Chat overlay ────────────────────────────────────────────────────────
  private chatLines:    Phaser.GameObjects.Text[] = [];

  constructor() { super({ key: "RaceScene" }); }

  // ── Init (called by React layer) ─────────────────────────────────────────
  init() {
    this.roomId        = this.registry.get("roomId") as string | undefined;
    this.isMultiplayer = !!this.roomId;
    this.forceGhostId  = this.registry.get("forceGhostId") as string | undefined;
  }

  create() {
    const trackData = createDefaultTrack();
    this.track      = new Track(trackData);

    this.buildTrackTiles();
    this.setupPlayer();

    if (this.isMultiplayer) {
      this.setupMultiplayer();
    } else {
      this.setupAI();
    }

    this.setupItemBoxes();
    this.setupInput();
    this.setupCamera();
    this.setupAudio();
    this.setupTouchControls();

    this.fx = new ParticleManager(this);

    this.hud = new RaceHUD(this, this.playerKart, TOTAL_LAPS, this.isMultiplayer ? 8 : 1 + AI_COUNT);

    if (!this.isMultiplayer) {
      // Single-player countdown
      this.hud.showCountdown(() => this.startRace());
    }
    // Multiplayer countdown is triggered by server race-start message

    this.physics.world.setBounds(0, 0, this.track.widthPx, this.track.heightPx);
  }

  // ── Track ───────────────────────────────────────────────────────────────
  private buildTrackTiles() {
    for (const tile of this.track.data.tiles) {
      const wx = tile.x * TILE_SIZE + TILE_SIZE / 2;
      const wy = tile.y * TILE_SIZE + TILE_SIZE / 2;
      let key  = `tile-${tile.type}`;
      if (!(key in this.textures.list)) key = "tile-grass";
      this.add.image(wx, wy, key).setAngle(tile.rotation).setDepth(0);
    }
  }

  // ── Player ──────────────────────────────────────────────────────────────
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

  // ── AI (single-player) ──────────────────────────────────────────────────
  private setupAI() {
    const starts    = this.track.getStartPositions();
    const waypoints = this.track.getCheckpoints() as Vec2[];
    const skins: SkinId[] = ["capy-racer","capy-pirate","capy-astronaut","capy-samurai"];
    const aiNames   = ["TurboNut 🤖","BananaBot 🍌","SlowPoke 🐢","ZoomZoom ⚡"];

    this.aiDrivers = createAIDrivers(
      waypoints, starts, skins, "medium",
      Math.min(AI_COUNT, starts.length - 1), TOTAL_LAPS
    );

    this.aiDrivers.forEach((ai, i) => {
      const sprite = new CapySprite(this, ai.kart, false, aiNames[i] ?? `AI-${i}`);
      this.aiSprites.set(ai.kart.id, sprite);
    });
  }

  // ── Multiplayer networking ───────────────────────────────────────────────
  private setupMultiplayer() {
    const localPlayer: Player = {
      id:       this.playerKart.playerId,
      username: `Capy_${this.playerKart.playerId.slice(0, 5)}`,
      skin:     this.playerKart.skin,
      xp:       0,
      elo:      1000,
      isGuest:  true,
    };

    this.net = new NetManager(localPlayer);

    // Handle room state updates (who's in lobby)
    this.net.on("room-update", (players, status) => {
      // Update ghost cars for existing players
      for (const p of players) {
        if (p.id === localPlayer.id) continue;
        if (!this.ghostCars.has(p.id)) {
          const starts = this.track.getStartPositions();
          const idx    = this.ghostCars.size + 1;
          const start  = starts[idx] ?? starts[starts.length - 1];
          const ghost  = new GhostCar(this, p.id, p.username, p.skin as SkinId, start.x, start.y);
          this.ghostCars.set(p.id, ghost);
        }
      }
    });

    // Server triggers race start (countdown)
    this.net.on("race-start", (countdownMs) => {
      this.hud.showCountdown(() => this.startRace());
    });

    // Remote kart state updates
    this.net.on("state-update", (playerId, state) => {
      const ghost = this.ghostCars.get(playerId);
      if (ghost) {
        ghost.receiveState({
          x:          state.x,
          y:          state.y,
          angle:      state.angle,
          speed:      state.speed,
          isDrifting: state.isDrifting,
        });
      }
    });

    // New player joining
    this.net.on("player-join", (player) => {
      if (player.id === localPlayer.id) return;
      if (!this.ghostCars.has(player.id)) {
        const starts = this.track.getStartPositions();
        const idx    = this.ghostCars.size + 1;
        const start  = starts[Math.min(idx, starts.length - 1)];
        const ghost  = new GhostCar(this, player.id, player.username, player.skin as SkinId, start.x, start.y);
        this.ghostCars.set(player.id, ghost);
      }
    });

    // Player leaving
    this.net.on("player-leave", (playerId) => {
      const ghost = this.ghostCars.get(playerId);
      ghost?.destroy();
      this.ghostCars.delete(playerId);
    });

    // Race finish
    this.net.on("race-finish", (results) => {
      const myResult = results.find(r => r.playerId === localPlayer.id);
      if (myResult && !this.raceFinished) {
        this.raceFinished = true;
        this.hud.showRaceFinish(myResult.position, myResult.totalTime);
      }
    });

    // Chat
    this.net.on("chat", (playerId, message) => {
      const ghost = this.ghostCars.get(playerId);
      const name  = ghost?.username ?? playerId.slice(0, 6);
      this.showChatLine(`${name}: ${message}`);
    });

    // Connect (non-blocking — game renders while connecting)
    this.net.connect(this.roomId).then(() => {
      // Signal ready after a short lobby pause
      this.time.delayedCall(500, () => this.net?.sendReady());
    }).catch(err => {
      console.warn("[RaceScene] Multiplayer connect failed, falling back to solo", err);
      this.isMultiplayer = false;
      this.setupAI();
      this.hud.showCountdown(() => this.startRace());
    });
  }

  private startRace() {
    this.raceStarted   = true;
    this.raceStartTime = this.time.now;
    this.playerKart.raceStartTime = this.raceStartTime;
    this.hud.setRaceStartTime(this.raceStartTime);
    for (const ai of this.aiDrivers) ai.kart.raceStartTime = this.raceStartTime;

    // Start recording
    this.recorder = new ReplayRecorder();
    this.recorder.start(
      this.track.data.id,
      this.track.data.name,
      TOTAL_LAPS
    );

    // Load ghost for this track (solo only)
    // Priority: explicit forceGhostId (from "Ghost Race" link) > best local replay
    if (!this.isMultiplayer) {
      let ghostReplay = null;
      if (this.forceGhostId) {
        ghostReplay = loadReplayLocally(this.forceGhostId);
      }
      if (!ghostReplay) {
        ghostReplay = getBestLocalReplay(this.track.data.id);
      }
      if (ghostReplay) {
        this.ghostPlayer = new ReplayPlayer(ghostReplay);
        this.ghostPlayer.start();
        this.ghostSprite = new GhostSprite(this, this.ghostPlayer);
        this.ghostRaceMode = true;
      }
    }
  }

  // ── Item boxes ───────────────────────────────────────────────────────────
  private setupItemBoxes() {
    for (const pos of this.track.getItemBoxPositions()) {
      this.itemBoxes.push(new ItemBox(this, pos.x, pos.y));
    }
  }

  // ── Input ────────────────────────────────────────────────────────────────
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
    this.chatKey    = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
  }

  // ── Camera ───────────────────────────────────────────────────────────────
  private setupCamera() {
    this.cameras.main
      .setBounds(0, 0, this.track.widthPx, this.track.heightPx)
      .startFollow(this.playerSprite.sprite, true, 0.08, 0.08)
      .setZoom(1.5);
  }

  // ── Audio ────────────────────────────────────────────────────────────────
  private setupAudio() {
    this.sound = getSoundManager();

    // Resume/init AudioContext on first user gesture (browser autoplay policy)
    const unlock = () => {
      this.sound.init();
      this.sound.resume();
      this.sound.startEngine();
      this.sound.startMusic();
      this.input.off("pointerdown", unlock);
      this.input.keyboard?.off("keydown", unlock);
    };
    this.input.once("pointerdown", unlock);
    this.input.keyboard?.once("keydown", unlock);

    // Mute toggle button (top-right corner)
    this.muteIcon = this.add.text(this.scale.width - 20, this.scale.height - 20, "🔊", {
      fontSize: "22px",
    })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(500)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", (_p: Phaser.Input.Pointer, _x: number, _y: number, e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        const muted = this.sound.toggleMute();
        this.muteIcon.setText(muted ? "🔇" : "🔊");
      });
  }

  // ── Touch controls ───────────────────────────────────────────────────────
  private setupTouchControls() {
    this.touch = new TouchControls(this);
  }

  // ── Main update ──────────────────────────────────────────────────────────
  update(_t: number, delta: number) {
    if (!this.raceStarted || this.raceFinished) return;
    const dt = Math.min(delta / 1000, 0.05);

    this.updatePlayer(dt);
    if (!this.isMultiplayer) this.updateAI(dt);
    this.updateGhosts(dt);
    this.updateGhostRace();
    this.checkItemPickups();
    this.updateProjectiles(dt);
    this.checkCheckpoints();
    this.updatePositions();
    this.updateSprites();

    // Tick replay recorder every frame
    this.recorder?.tick(this.playerKart.state);

    const allKarts = [
      this.playerKart,
      ...this.aiDrivers.map(a => a.kart),
      ...Array.from(this.ghostCars.values()).map(g => g.kart),
    ];
    this.hud.update(allKarts, this.track.widthPx, this.track.heightPx);

    // Send state to server
    if (this.isMultiplayer && this.net) {
      this.net.tickSendState(dt, this.playerKart);
      this.net.sendInput(this.playerKart.input);
    }
  }

  private updatePlayer(dt: number) {
    const touchActive = this.touch?.enabled;

    const up    = this.cursors.up.isDown    || this.wasd.up.isDown    || (touchActive && this.touch.input.up);
    const down  = this.cursors.down.isDown  || this.wasd.down.isDown  || (touchActive && this.touch.input.down);
    const left  = this.cursors.left.isDown  || this.wasd.left.isDown  || (touchActive && this.touch.input.left);
    const right = this.cursors.right.isDown || this.wasd.right.isDown || (touchActive && this.touch.input.right);
    const drift = this.driftKey.isDown || (touchActive && this.touch.input.drift);

    if (this.prevDrifting && !drift && this.playerKart.state.driftCharge > 0.5) {
      this.playerSprite.showMiniTurbo();
      this.sound.play("boost");
    }
    this.prevDrifting = drift;

    this.playerKart.input = { up, down, left, right, drift };

    const itemPressed = Phaser.Input.Keyboard.JustDown(this.useItemKey) || (touchActive && this.touch.consumeItemPress());
    if (itemPressed) {
      const type = this.playerKart.usePowerUp();
      if (type) {
        this.fireItem(type, this.playerKart);
        this.sound.play("item-use");
        if (type === "speed-boost" || type === "nitro") this.sound.play("boost");
      }
    }

    const surface = this.track.getSurfaceAt(this.playerKart.state.position.x, this.playerKart.state.position.y);
    this.playerKart.update(dt, surface);
    this.clampToBounds(this.playerKart);

    // ── Audio + particle feedback ──────────────────────────────────────────
    const normSpeed = Math.min(1, Math.abs(this.playerKart.state.speed) / 520);
    this.sound.updateEngine(normSpeed, this.playerKart.isBoosting());

    const { x, y } = this.playerKart.state.position;
    this.fx.updateExhaust(x, y, this.playerKart.state.angle, this.playerKart.state.speed);
    this.fx.updateBoost(x, y, this.playerKart.state.angle, this.playerKart.isBoosting());

    if (this.playerKart.state.isDrifting && this.playerKart.state.driftCharge > 0.3) {
      this.fx.emitDriftSparks(x, y);
      if (Math.random() < 0.15) this.sound.play("drift");
    }
  }


  private updateAI(dt: number) {
    for (const ai of this.aiDrivers) {
      if (ai.kart.isFinished()) continue;
      const surface = this.track.getSurfaceAt(ai.kart.state.position.x, ai.kart.state.position.y);
      ai.update(dt, surface);
      this.clampToBounds(ai.kart);
    }
  }

  private updateGhosts(dt: number) {
    for (const ghost of this.ghostCars.values()) ghost.update(dt);
  }

  private updateGhostRace(): void {
    if (!this.ghostPlayer || !this.ghostSprite) return;
    const playerRaceMs = this.raceStarted
      ? this.time.now - this.raceStartTime
      : 0;
    this.ghostSprite.update(playerRaceMs);
  }

  private clampToBounds(kart: CapyKart) {
    kart.state.position.x = Phaser.Math.Clamp(kart.state.position.x, 0, this.track.widthPx);
    kart.state.position.y = Phaser.Math.Clamp(kart.state.position.y, 0, this.track.heightPx);
  }

  // ── Item pickups ─────────────────────────────────────────────────────────
  private checkItemPickups() {
    const allKarts = [this.playerKart, ...this.aiDrivers.map(a => a.kart)];
    for (const box of this.itemBoxes) {
      for (const kart of allKarts) {
        if (kart.heldPowerUp) continue;
        const pu = box.checkPickup(kart.state.position.x, kart.state.position.y);
        if (pu) {
          kart.pickUpPowerUp(pu);
          this.fx.emitItemPickup(kart.state.position.x, kart.state.position.y);
          if (kart === this.playerKart) this.sound.play("item-pickup");
        }
      }
    }
  }

  private fireItem(type: PowerUpType, kart: CapyKart) {
    if (type !== "banana" && type !== "shell") return;
    const key   = type === "banana" ? "proj-banana" : "proj-shell";
    const speed = type === "shell"  ? 620 : 0;
    const sprite = this.add.image(kart.state.position.x, kart.state.position.y, key).setDepth(8);
    this.projectiles.push({ type, sprite, x: kart.state.position.x, y: kart.state.position.y, angle: kart.state.angle, speed, ownerId: kart.id, active: true });
  }

  private updateProjectiles(dt: number) {
    const allKarts = [this.playerKart, ...this.aiDrivers.map(a => a.kart)];
    for (const proj of this.projectiles) {
      if (!proj.active) continue;
      proj.x += Math.cos(proj.angle) * proj.speed * dt;
      proj.y += Math.sin(proj.angle) * proj.speed * dt;
      proj.sprite.setPosition(proj.x, proj.y);
      for (const kart of allKarts) {
        if (kart.id === proj.ownerId) continue;
        if (distance(kart.state.position, { x: proj.x, y: proj.y }) < 30) {
          kart.hitByItem();
          proj.active = false;
          proj.sprite.destroy();
          this.fx.emitImpact(proj.x, proj.y);
          if (kart === this.playerKart) this.sound.play("hit");
          const flash = this.add.circle(proj.x, proj.y, 20, 0xFF4444, 0.9).setDepth(20);
          this.tweens.add({ targets: flash, scale: 3, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
        }
      }
      if (proj.x < 0 || proj.x > this.track.widthPx || proj.y < 0 || proj.y > this.track.heightPx) {
        proj.active = false;
        proj.sprite.destroy();
      }
    }
    this.projectiles = this.projectiles.filter(p => p.active);
  }

  // ── Checkpoints + laps ───────────────────────────────────────────────────
  private checkCheckpoints() {
    const allKarts    = [this.playerKart, ...this.aiDrivers.map(a => a.kart)];
    const checkpoints = this.track.getCheckpoints();
    const finishLine  = checkpoints[0];

    for (const kart of allKarts) {
      if (kart.isFinished()) continue;
      const pos = kart.state.position;

      checkpoints.forEach((cp, i) => {
        if (i === 0) return;
        if (distance(pos, cp) < CHECKPOINT_R) {
          kart.passCheckpoint(i, checkpoints.length - 1, this.time.now);
          // Tell server
          if (this.isMultiplayer && kart === this.playerKart) {
            this.net?.send?.({ type: "game-state" as never, state: { checkpoint: i } as never } as never);
          }
        }
      });

      if (distance(pos, finishLine) < FINISH_R) {
        const finished = kart.completeLap(this.time.now);
        if (kart.currentLap > 0 && kart.currentLap <= TOTAL_LAPS && kart === this.playerKart) {
          this.hud.showLapFlash(kart.currentLap);
          this.sound.play("lap");
          if (this.isMultiplayer) {
            this.net?.send?.({ type: "game-state" as never, state: { lapComplete: { lapTime: this.playerKart.lapTimes.at(-1) ?? 0 } } as never } as never);
          }
        }
        if (finished) this.onKartFinished(kart);
      }
    }
  }

  private onKartFinished(kart: CapyKart) {
    const pos = this.aiDrivers.filter(a => a.kart.isFinished()).length + 1;
    kart.racePosition = pos;
    if (kart === this.playerKart) {
      const totalTime = kart.getTotalRaceTime(this.time.now);

      // Stop recorder and save replay
      if (this.recorder?.isRecording) {
        this.recorder.recordEvent("finish", { position: pos, totalTime });
        const replay = this.recorder.stop(
          "Player",
          this.playerKart.skin,
          totalTime,
          [...this.playerKart.lapTimes],
          pos
        );
        saveReplayLocally(replay);
        (window as unknown as { __capyjamLastReplayId?: string }).__capyjamLastReplayId = replay.id;
        // Dispatch custom event so React UI can show replay button
        window.dispatchEvent(new CustomEvent("capyjam:race-finish", {
          detail: { replayId: replay.id, totalTime, position: pos },
        }));
      }

      if (this.isMultiplayer) {
        this.net?.send?.({ type: "game-state" as never, state: { raceFinish: { totalTime } } as never } as never);
      } else {
        this.raceFinished = true;
        this.sound.play("finish");
        this.sound.stopEngine();
        this.fx.celebrateFinish();
        this.hud.showRaceFinish(pos, totalTime);
      }
    }
  }

  // ── Position sort ────────────────────────────────────────────────────────
  private updatePositions() {
    const allKarts    = [this.playerKart, ...this.aiDrivers.map(a => a.kart)];
    const checkpoints = this.track.getCheckpoints();
    for (const kart of allKarts) {
      const nextCp = checkpoints[(kart.lapData.checkpointsPassed.size) % checkpoints.length];
      const dist   = nextCp ? distance(kart.state.position, nextCp) : 0;
      kart.progressDistance = kart.currentLap * 10000 + kart.lapData.checkpointsPassed.size * 1000 - dist * 0.01;
    }
    const sorted = [...allKarts].sort((a, b) => b.progressDistance - a.progressDistance);
    sorted.forEach((k, i) => { k.racePosition = i + 1; });
  }

  // ── Sprite sync ──────────────────────────────────────────────────────────
  private updateSprites() {
    this.playerSprite.update();
    for (const sprite of this.aiSprites.values()) sprite.update();
  }

  // ── Chat ─────────────────────────────────────────────────────────────────
  private showChatLine(text: string) {
    const W = this.scale.width;
    const y = this.scale.height - 180 - this.chatLines.length * 22;
    const line = this.add.text(W / 2, y, text, {
      fontSize: "13px", color: "#ffffffcc",
      stroke: "#000", strokeThickness: 3,
      fontFamily: "system-ui",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(190);

    this.chatLines.push(line);
    this.tweens.add({ targets: line, alpha: 0, delay: 5000, duration: 1000, onComplete: () => {
      line.destroy();
      this.chatLines = this.chatLines.filter(l => l !== line);
    }});
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────
  shutdown() {
    this.net?.destroy();
    this.ghostCars.forEach(g => g.destroy());
    this.ghostSprite?.destroy();
    this.sound?.stopEngine();
    this.sound?.stopMusic();
    this.fx?.destroy();
    this.touch?.destroy();
  }
}
