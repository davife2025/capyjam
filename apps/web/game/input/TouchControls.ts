import Phaser from "phaser";
import type { KartInput } from "@capyjam/game-engine";

const STICK_RADIUS  = 55;
const STICK_DEAD    = 12;
const BTN_RADIUS    = 38;

/**
 * TouchControls: virtual joystick (steer + accelerate) + drift/item buttons.
 * Renders as a fixed HUD overlay; only active on touch devices.
 */
export class TouchControls {
  private scene: Phaser.Scene;
  input: KartInput = { up: false, down: false, left: false, right: false, drift: false };
  itemPressed = false;

  private joyBase!:    Phaser.GameObjects.Arc;
  private joyThumb!:   Phaser.GameObjects.Arc;
  private joyPointerId: number | null = null;
  private joyOrigin    = { x: 0, y: 0 };

  private driftBtn!:   Phaser.GameObjects.Arc;
  private driftLabel!: Phaser.GameObjects.Text;
  private driftPointerId: number | null = null;

  private itemBtn!:    Phaser.GameObjects.Arc;
  private itemLabel!:  Phaser.GameObjects.Text;
  private itemPointerId: number | null = null;

  enabled: boolean;

  constructor(scene: Phaser.Scene) {
    this.scene   = scene;
    this.enabled = this.detectTouch();

    if (!this.enabled) return;
    this.build();
  }

  private detectTouch(): boolean {
    if (typeof window === "undefined") return false;
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }

  private build(): void {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    const DEPTH = 500;

    // ── Virtual joystick (bottom-left) ────────────────────────────────────
    const joyX = 100;
    const joyY = H - 110;
    this.joyOrigin = { x: joyX, y: joyY };

    this.joyBase = this.scene.add.circle(joyX, joyY, STICK_RADIUS, 0x000000, 0.25)
      .setStrokeStyle(2, 0xffffff, 0.3)
      .setScrollFactor(0).setDepth(DEPTH);

    this.joyThumb = this.scene.add.circle(joyX, joyY, STICK_RADIUS * 0.5, 0xF9CB42, 0.6)
      .setScrollFactor(0).setDepth(DEPTH + 1);

    // ── Drift button (bottom-right, lower) ────────────────────────────────
    const driftX = W - 70;
    const driftY = H - 60;
    this.driftBtn = this.scene.add.circle(driftX, driftY, BTN_RADIUS, 0x7FDDFF, 0.25)
      .setStrokeStyle(2, 0x7FDDFF, 0.5)
      .setScrollFactor(0).setDepth(DEPTH);
    this.driftLabel = this.scene.add.text(driftX, driftY, "DRIFT", {
      fontSize: "11px", color: "#ffffff", fontFamily: "system-ui", fontStyle: "bold",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1);

    // ── Item button (bottom-right, upper) ─────────────────────────────────
    const itemX = W - 130;
    const itemY = H - 140;
    this.itemBtn = this.scene.add.circle(itemX, itemY, BTN_RADIUS, 0xF9CB42, 0.25)
      .setStrokeStyle(2, 0xF9CB42, 0.5)
      .setScrollFactor(0).setDepth(DEPTH);
    this.itemLabel = this.scene.add.text(itemX, itemY, "📦", {
      fontSize: "24px",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1);

    this.setupPointerEvents();
  }

  private setupPointerEvents(): void {
    const scene = this.scene;

    scene.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      const W = scene.scale.width;

      // Joystick zone (left half)
      if (p.x < W / 2 && this.joyPointerId === null) {
        this.joyPointerId = p.id;
        this.updateJoystick(p.x, p.y);
        return;
      }

      // Drift button
      if (this.distTo(p, this.driftBtn) < BTN_RADIUS * 1.3 && this.driftPointerId === null) {
        this.driftPointerId = p.id;
        this.input.drift = true;
        this.driftBtn.setFillStyle(0x7FDDFF, 0.5);
        return;
      }

      // Item button
      if (this.distTo(p, this.itemBtn) < BTN_RADIUS * 1.3 && this.itemPointerId === null) {
        this.itemPointerId = p.id;
        this.itemPressed   = true;
        this.itemBtn.setFillStyle(0xF9CB42, 0.5);
        return;
      }
    });

    scene.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (p.id === this.joyPointerId) this.updateJoystick(p.x, p.y);
    });

    scene.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (p.id === this.joyPointerId) {
        this.joyPointerId = null;
        this.resetJoystick();
      }
      if (p.id === this.driftPointerId) {
        this.driftPointerId = null;
        this.input.drift = false;
        this.driftBtn.setFillStyle(0x7FDDFF, 0.25);
      }
      if (p.id === this.itemPointerId) {
        this.itemPointerId = null;
        this.itemBtn.setFillStyle(0xF9CB42, 0.25);
      }
    });
  }

  private distTo(p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Arc): number {
    return Phaser.Math.Distance.Between(p.x, p.y, obj.x, obj.y);
  }

  private updateJoystick(px: number, py: number): void {
    const dx = px - this.joyOrigin.x;
    const dy = py - this.joyOrigin.y;
    const dist = Math.min(STICK_RADIUS, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx);

    const tx = this.joyOrigin.x + Math.cos(angle) * dist;
    const ty = this.joyOrigin.y + Math.sin(angle) * dist;
    this.joyThumb.setPosition(tx, ty);

    if (dist < STICK_DEAD) {
      this.input.up = this.input.down = this.input.left = this.input.right = false;
      return;
    }

    // Vertical = accelerate/brake, horizontal = steer
    this.input.up    = dy < -STICK_DEAD;
    this.input.down  = dy >  STICK_DEAD;
    this.input.left  = dx < -STICK_DEAD;
    this.input.right = dx >  STICK_DEAD;
  }

  private resetJoystick(): void {
    this.joyThumb.setPosition(this.joyOrigin.x, this.joyOrigin.y);
    this.input.up = this.input.down = this.input.left = this.input.right = false;
  }

  // Call once per frame; resets one-shot item press flag
  consumeItemPress(): boolean {
    if (this.itemPressed) {
      this.itemPressed = false;
      return true;
    }
    return false;
  }

  destroy(): void {
    if (!this.enabled) return;
    this.joyBase?.destroy();
    this.joyThumb?.destroy();
    this.driftBtn?.destroy();
    this.driftLabel?.destroy();
    this.itemBtn?.destroy();
    this.itemLabel?.destroy();
  }
}
