import Phaser from "phaser";
import { createDefaultTrack, Track, TILE_SIZE } from "@capyjam/game-engine";
import { ReplayPlayer } from "@/game/replay/ReplayPlayer";
import { GhostSprite } from "@/game/replay/GhostSprite";
import type { ReplayData } from "@/game/replay/ReplayRecorder";

type PlaybackState = "playing" | "paused" | "finished";

export class ReplayViewerScene extends Phaser.Scene {
  private track!:    Track;
  private player!:   ReplayPlayer;
  private ghost!:    GhostSprite;

  // HUD
  private pbState:   PlaybackState = "paused";
  private rateText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private progBg!:   Phaser.GameObjects.Rectangle;
  private progBar!:  Phaser.GameObjects.Rectangle;
  private btnPlay!:  Phaser.GameObjects.Text;
  private btnFast!:  Phaser.GameObjects.Text;
  private lapTexts:  Phaser.GameObjects.Text[] = [];

  constructor() { super({ key: "ReplayViewerScene" }); }

  create() {
    const replay = this.registry.get("replayData") as ReplayData;

    // Build track
    const trackData = createDefaultTrack(); // TODO: load from replay.trackId
    this.track      = new Track(trackData);

    // Draw tiles
    for (const tile of this.track.data.tiles) {
      const wx = tile.x * TILE_SIZE + TILE_SIZE / 2;
      const wy = tile.y * TILE_SIZE + TILE_SIZE / 2;
      let key  = `tile-${tile.type}`;
      if (!(key in this.textures.list)) key = "tile-grass";
      this.add.image(wx, wy, key).setDepth(0);
    }

    // Set up replay player + ghost
    this.player = new ReplayPlayer(replay);
    this.ghost  = new GhostSprite(this, this.player);

    // Hook event callbacks for visual feedback
    this.player.onEventCallback(evt => {
      if (evt.type === "lap") this.flashLap();
    });

    // Camera follows ghost
    this.cameras.main
      .setBounds(0, 0, this.track.widthPx, this.track.heightPx)
      .startFollow(this.ghost.sprite, true, 0.08, 0.08)
      .setZoom(1.4);

    // Build playback controls HUD
    this.buildHUD(replay);

    // Auto-play after small delay
    this.time.delayedCall(500, () => {
      this.player.start();
      this.pbState = "playing";
      this.updatePlayBtn();
    });
  }

  private buildHUD(replay: ReplayData): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const DEPTH = 200;

    // Dark panel at bottom
    this.add.rectangle(W / 2, H - 28, W, 56, 0x000000, 0.7)
      .setScrollFactor(0).setDepth(DEPTH);

    // Progress bar background
    this.progBg = this.add.rectangle(W / 2, H - 46, W - 200, 6, 0x444444)
      .setScrollFactor(0).setDepth(DEPTH + 1);

    // Progress bar fill
    this.progBar = this.add.rectangle(
      this.progBg.x - this.progBg.width / 2,
      H - 46, 0, 6, 0x7F77DD
    )
      .setOrigin(0, 0.5)
      .setScrollFactor(0).setDepth(DEPTH + 2);

    // Time display
    this.timeText = this.add.text(24, H - 12, "0:00.000 / " + fmtTime(replay.totalTime), {
      fontSize: "12px", color: "#cccccc", fontFamily: "monospace",
      stroke: "#000", strokeThickness: 2, resolution: 2,
    }).setOrigin(0, 1).setScrollFactor(0).setDepth(DEPTH + 2);

    // Playback rate
    this.rateText = this.add.text(W - 24, H - 12, "1×", {
      fontSize: "12px", color: "#aaaaaa", fontFamily: "monospace",
      stroke: "#000", strokeThickness: 2, resolution: 2,
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(DEPTH + 2);

    // Play/pause button
    this.btnPlay = this.add.text(W / 2 - 36, H - 12, "⏸", {
      fontSize: "20px",
    })
      .setOrigin(0.5, 1)
      .setScrollFactor(0).setDepth(DEPTH + 3)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.togglePause());

    // Fast-forward button
    this.btnFast = this.add.text(W / 2 + 4, H - 12, "⏩", {
      fontSize: "20px",
    })
      .setOrigin(0, 1)
      .setScrollFactor(0).setDepth(DEPTH + 3)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.cycleSpeed());

    // Lap time chips at top
    replay.lapTimes.forEach((lt, i) => {
      const best = Math.min(...replay.lapTimes);
      const txt  = this.add.text(
        W / 2 + (i - (replay.lapTimes.length - 1) / 2) * 110,
        16,
        `L${i + 1}: ${fmtTime(lt)}`,
        {
          fontSize: "12px",
          color: lt === best ? "#F9CB42" : "#888888",
          fontFamily: "monospace",
          stroke: "#000", strokeThickness: 3, resolution: 2,
        }
      ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 1);
      this.lapTexts.push(txt);
    });

    // Keyboard shortcuts
    this.input.keyboard?.on("keydown-SPACE", () => this.togglePause());
    this.input.keyboard?.on("keydown-F",     () => this.cycleSpeed());
    this.input.keyboard?.on("keydown-R",     () => this.restartReplay());
  }

  update(): void {
    if (this.pbState !== "playing") return;

    this.ghost.update();

    if (this.player.isFinished) {
      this.pbState = "finished";
      this.updatePlayBtn();
      this.showFinishOverlay();
      return;
    }

    // Update progress bar
    const prog = this.player.progress;
    this.progBar.width = this.progBg.width * prog;

    // Update time text
    this.timeText.setText(
      `${fmtTime(this.player.currentTime)} / ${fmtTime(this.player.duration)}`
    );
  }

  private togglePause(): void {
    if (this.pbState === "finished") { this.restartReplay(); return; }
    if (this.pbState === "playing") {
      this.player.pause();
      this.pbState = "paused";
    } else {
      this.player.resume();
      this.pbState = "playing";
    }
    this.updatePlayBtn();
  }

  private cycleSpeed(): void {
    const rates  = [0.5, 1, 2, 4];
    const cur    = this.player.playbackRate;
    const idx    = rates.indexOf(cur);
    const next   = rates[(idx + 1) % rates.length];
    this.player.setPlaybackRate(next);
    this.rateText.setText(`${next}×`);
  }

  private restartReplay(): void {
    this.player.start();
    this.pbState = "playing";
    this.updatePlayBtn();
  }

  private updatePlayBtn(): void {
    const icons: Record<PlaybackState, string> = {
      playing:  "⏸",
      paused:   "▶",
      finished: "↩",
    };
    this.btnPlay.setText(icons[this.pbState]);
  }

  private flashLap(): void {
    const W = this.scale.width;
    const txt = this.add.text(W / 2, 60, "LAP!", {
      fontSize: "52px", color: "#F9CB42", fontStyle: "bold",
      stroke: "#000", strokeThickness: 6, resolution: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(250);

    this.tweens.add({
      targets: txt, y: 30, alpha: 0, duration: 1200,
      ease: "Cubic.easeOut", onComplete: () => txt.destroy(),
    });
  }

  private showFinishOverlay(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.add.rectangle(W / 2, H / 2 - 40, W, 120, 0x000000, 0.7)
      .setScrollFactor(0).setDepth(260);

    this.add.text(W / 2, H / 2 - 70, "Replay finished", {
      fontSize: "18px", color: "#aaaaaa", fontFamily: "system-ui",
      stroke: "#000", strokeThickness: 3, resolution: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(261);

    this.add.text(W / 2, H / 2 - 40, `${fmtTime(this.player.duration)}`, {
      fontSize: "36px", color: "#F9CB42", fontStyle: "bold",
      stroke: "#000", strokeThickness: 5, resolution: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(261);

    this.add.text(W / 2, H / 2, "[ Press Space or ↩ to replay ]", {
      fontSize: "14px", color: "#777777", fontFamily: "system-ui",
      resolution: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(261);
  }
}

function fmtTime(ms: number): string {
  const m   = Math.floor(ms / 60000);
  const s   = Math.floor((ms % 60000) / 1000);
  const mil = Math.floor(ms % 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(mil).padStart(3, "0")}`;
}
