import Phaser from "phaser";
import type { CapyKart } from "@capyjam/game-engine";
import { POWER_UP_DISPLAY } from "@capyjam/game-engine";

const PAD    = 18;
const DEPTH  = 200;
const STYLE_BASE = {
  fontFamily: "system-ui, sans-serif",
  stroke: "#000000",
  strokeThickness: 4,
  resolution: 2,
};

export class RaceHUD {
  private scene:       Phaser.Scene;
  private playerKart:  CapyKart;
  private totalLaps:   number;
  private totalRacers: number;

  // Text nodes
  private txtLap:      Phaser.GameObjects.Text;
  private txtSpeed:    Phaser.GameObjects.Text;
  private txtTime:     Phaser.GameObjects.Text;
  private txtPosition: Phaser.GameObjects.Text;
  private txtPowerUp:  Phaser.GameObjects.Text;
  private txtBestLap:  Phaser.GameObjects.Text;

  // Panels
  private panelTL:     Phaser.GameObjects.Rectangle;
  private panelBL:     Phaser.GameObjects.Rectangle;
  private panelBR:     Phaser.GameObjects.Rectangle;
  private powerUpPanel: Phaser.GameObjects.Rectangle;

  // Countdown / race message
  private msgText:     Phaser.GameObjects.Text | null = null;

  // Minimap
  private minimapBg:   Phaser.GameObjects.Rectangle;
  private minimapDots: Map<string, Phaser.GameObjects.Arc> = new Map();

  private raceStartTime = 0;

  constructor(
    scene: Phaser.Scene,
    playerKart: CapyKart,
    totalLaps: number,
    totalRacers: number
  ) {
    this.scene       = scene;
    this.playerKart  = playerKart;
    this.totalLaps   = totalLaps;
    this.totalRacers = totalRacers;

    const W = scene.scale.width;
    const H = scene.scale.height;

    // ── Top-left panel: lap + time ──────────────────────────────────────────
    this.panelTL = scene.add
      .rectangle(PAD, PAD, 180, 70, 0x000000, 0.55)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH);

    this.txtLap = scene.add
      .text(PAD + 12, PAD + 10, "LAP 1 / 3", { ...STYLE_BASE, fontSize: "17px", color: "#F9CB42" })
      .setScrollFactor(0).setDepth(DEPTH + 1);

    this.txtTime = scene.add
      .text(PAD + 12, PAD + 36, "0:00.000", { ...STYLE_BASE, fontSize: "15px", color: "#ffffff" })
      .setScrollFactor(0).setDepth(DEPTH + 1);

    // ── Bottom-left panel: speed ────────────────────────────────────────────
    this.panelBL = scene.add
      .rectangle(PAD, H - PAD - 56, 140, 52, 0x000000, 0.55)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH);

    this.txtSpeed = scene.add
      .text(PAD + 10, H - PAD - 46, "0 km/h", { ...STYLE_BASE, fontSize: "22px", color: "#7FDDFF" })
      .setScrollFactor(0).setDepth(DEPTH + 1);

    // ── Bottom-right: position + best lap ──────────────────────────────────
    this.panelBR = scene.add
      .rectangle(W - PAD - 130, H - PAD - 56, 130, 52, 0x000000, 0.55)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH);

    this.txtPosition = scene.add
      .text(W - PAD - 72, H - PAD - 44, "1st", { ...STYLE_BASE, fontSize: "26px", color: "#F9CB42", fontStyle: "bold" })
      .setOrigin(0.5, 0)
      .setScrollFactor(0).setDepth(DEPTH + 1);

    this.txtBestLap = scene.add
      .text(W - PAD - 72, H - PAD - 18, "Best: --", { ...STYLE_BASE, fontSize: "11px", color: "#888888" })
      .setOrigin(0.5, 0)
      .setScrollFactor(0).setDepth(DEPTH + 1);

    // ── Power-up panel (center-bottom) ─────────────────────────────────────
    this.powerUpPanel = scene.add
      .rectangle(W / 2, H - PAD - 56, 150, 52, 0x000000, 0.55)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH);

    this.txtPowerUp = scene.add
      .text(W / 2, H - PAD - 30, "", { ...STYLE_BASE, fontSize: "26px", color: "#ffffff" })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0).setDepth(DEPTH + 1);

    // ── Minimap (top-right) ─────────────────────────────────────────────────
    this.minimapBg = scene.add
      .rectangle(W - PAD - 100, PAD, 100, 70, 0x000000, 0.55)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH);
  }

  setRaceStartTime(t: number): void {
    this.raceStartTime = t;
  }

  update(
    allKarts: CapyKart[],
    trackW: number,
    trackH: number
  ): void {
    const W  = this.scene.scale.width;
    const H  = this.scene.scale.height;
    const kart = this.playerKart;

    // ── Lap ────────────────────────────────────────────────────────────────
    const lapDisplay = Math.min(kart.currentLap + 1, this.totalLaps);
    this.txtLap.setText(`LAP ${lapDisplay} / ${this.totalLaps}`);

    // ── Time ───────────────────────────────────────────────────────────────
    const elapsed = this.raceStartTime > 0
      ? this.scene.time.now - this.raceStartTime
      : 0;
    this.txtTime.setText(formatTime(elapsed));

    // ── Speed ──────────────────────────────────────────────────────────────
    const kph = Math.abs(Math.round(kart.state.speed * 0.12));
    this.txtSpeed.setText(`${kph} km/h`);

    // ── Position ───────────────────────────────────────────────────────────
    this.txtPosition.setText(ordinal(kart.racePosition || 1));
    const bestLap = kart.getBestLap();
    this.txtBestLap.setText(bestLap ? `Best: ${formatTime(bestLap)}` : "Best: --");

    // ── Power-up ───────────────────────────────────────────────────────────
    if (kart.heldPowerUp) {
      const info = POWER_UP_DISPLAY[kart.heldPowerUp];
      this.txtPowerUp.setText(`${info.emoji}  [Space]`);
      this.powerUpPanel.setFillStyle(0x000000, 0.7);
    } else if (kart.activeEffect) {
      const info = POWER_UP_DISPLAY[kart.activeEffect.type];
      const pct  = kart.activeEffect.remainingMs / 5000;
      this.txtPowerUp.setText(`${info.emoji} ${(kart.activeEffect.remainingMs / 1000).toFixed(1)}s`);
      this.powerUpPanel.setFillStyle(0x222222, 0.8);
    } else {
      this.txtPowerUp.setText("");
      this.powerUpPanel.setFillStyle(0x000000, 0.3);
    }

    // ── Minimap ─────────────────────────────────────────────────────────────
    const mmX  = W - PAD - 100;
    const mmY  = PAD;
    const mmW  = 100;
    const mmH  = 70;
    const scaleX = mmW / trackW;
    const scaleY = mmH / trackH;

    for (const k of allKarts) {
      const dotX = mmX + k.state.position.x * scaleX;
      const dotY = mmY + k.state.position.y * scaleY;

      if (!this.minimapDots.has(k.id)) {
        const isMe = k.id === this.playerKart.id;
        const dot  = this.scene.add.circle(dotX, dotY, isMe ? 5 : 3, isMe ? 0xF9CB42 : 0xFF4444)
          .setScrollFactor(0)
          .setDepth(DEPTH + 2);
        this.minimapDots.set(k.id, dot);
      } else {
        this.minimapDots.get(k.id)!.setPosition(dotX, dotY);
      }
    }
  }

  showCountdown(onGo: () => void): void {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;

    this.msgText = this.scene.add.text(W / 2, H / 2, "3", {
      ...STYLE_BASE,
      fontSize: "120px",
      color: "#F9CB42",
      fontStyle: "bold",
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(300);

    let n = 3;
    const tick = () => {
      n--;
      if (n > 0) {
        this.msgText!.setText(String(n));
        this.scene.tweens.add({
          targets: this.msgText,
          scaleX: { from: 1.4, to: 1 },
          scaleY: { from: 1.4, to: 1 },
          duration: 350,
        });
        this.scene.time.delayedCall(700, tick);
      } else {
        this.msgText!.setText("GO! 🐾").setColor("#7FDDFF");
        this.scene.tweens.add({
          targets: this.msgText,
          scaleX: { from: 1.5, to: 1 },
          scaleY: { from: 1.5, to: 1 },
          duration: 250,
        });
        this.scene.time.delayedCall(700, () => {
          this.msgText?.destroy();
          this.msgText = null;
        });
        onGo();
      }
    };

    this.scene.tweens.add({
      targets: this.msgText,
      scaleX: { from: 1.4, to: 1 },
      scaleY: { from: 1.4, to: 1 },
      duration: 350,
    });
    this.scene.time.delayedCall(700, tick);
  }

  showRaceFinish(position: number, totalTime: number): void {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;

    const overlay = this.scene.add
      .rectangle(W / 2, H / 2, W, H, 0x000000, 0.6)
      .setScrollFactor(0).setDepth(290);

    const msg = position === 1 ? "🏆 WINNER!" : `${ordinal(position)} Place`;
    const color = position === 1 ? "#F9CB42" : position <= 3 ? "#7FDDFF" : "#ffffff";

    this.scene.add.text(W / 2, H / 2 - 60, msg, {
      ...STYLE_BASE,
      fontSize: "64px",
      color,
      fontStyle: "bold",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300);

    this.scene.add.text(W / 2, H / 2 + 20, `Time: ${formatTime(totalTime)}`, {
      ...STYLE_BASE,
      fontSize: "24px",
      color: "#cccccc",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300);

    // Play again button (send message to React layer)
    const btn = this.scene.add
      .text(W / 2, H / 2 + 80, "[ Play Again ]", {
        ...STYLE_BASE,
        fontSize: "20px",
        color: "#F9CB42",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(300)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => btn.setColor("#ffffff"))
      .on("pointerout",  () => btn.setColor("#F9CB42"))
      .on("pointerdown", () => {
        this.scene.scene.restart();
      });
  }

  showLapFlash(lap: number): void {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;

    const txt = this.scene.add.text(W / 2, H / 3, `LAP ${lap}`, {
      ...STYLE_BASE,
      fontSize: "52px",
      color: "#F9CB42",
      fontStyle: "bold",
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(250);

    this.scene.tweens.add({
      targets: txt,
      y: H / 3 - 40,
      alpha: 0,
      duration: 1200,
      ease: "Cubic.easeOut",
      onComplete: () => txt.destroy(),
    });
  }

  destroy(): void {
    this.panelTL.destroy();
    this.panelBL.destroy();
    this.panelBR.destroy();
    this.powerUpPanel.destroy();
    this.minimapBg.destroy();
    this.txtLap.destroy();
    this.txtTime.destroy();
    this.txtSpeed.destroy();
    this.txtPosition.destroy();
    this.txtBestLap.destroy();
    this.txtPowerUp.destroy();
    this.minimapDots.forEach(d => d.destroy());
    this.msgText?.destroy();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ms: number): string {
  const m   = Math.floor(ms / 60000);
  const s   = Math.floor((ms % 60000) / 1000);
  const mil = Math.floor(ms % 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(mil).padStart(3, "0")}`;
}

function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}
