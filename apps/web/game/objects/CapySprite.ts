import Phaser from "phaser";
import type { CapyKart } from "@capyjam/game-engine";

const SHADOW_ALPHA  = 0.35;
const DRIFT_TINT    = 0xF9CB42;
const BOOST_TINT    = 0x7FDDFF;
const SPIN_TINT     = 0xFF4444;
const NORMAL_TINT   = 0xFFFFFF;
const NAME_OFFSET_Y = -32;

/**
 * CapySprite: visual representation of a kart in the scene.
 * Particles are now handled centrally by ParticleManager — this class
 * only owns the sprite, shadow and nametag.
 */
export class CapySprite {
  scene:    Phaser.Scene;
  kart:     CapyKart;
  sprite:   Phaser.GameObjects.Image;
  shadow:   Phaser.GameObjects.Image;
  nameTag:  Phaser.GameObjects.Text | null = null;
  isPlayer: boolean;

  constructor(
    scene:        Phaser.Scene,
    kart:         CapyKart,
    isPlayer      = false,
    displayName?: string
  ) {
    this.scene    = scene;
    this.kart     = kart;
    this.isPlayer = isPlayer;

    const { x, y } = kart.state.position;

    // Drop shadow drawn behind sprite
    this.shadow = scene.add
      .image(x + 4, y + 6, kart.skin)
      .setAlpha(SHADOW_ALPHA)
      .setTint(0x000000)
      .setDepth(4)
      .setScale(1.05);

    // Main kart sprite
    this.sprite = scene.add
      .image(x, y, kart.skin)
      .setDepth(10)
      .setOrigin(0.5, 0.5);

    // Name tag for AI / remote players
    if (displayName) {
      this.nameTag = scene.add
        .text(x, y + NAME_OFFSET_Y, displayName, {
          fontSize: "11px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 3,
          resolution: 2,
        })
        .setOrigin(0.5, 1)
        .setDepth(11)
        .setAlpha(0.85);
    }
  }

  update(): void {
    const { x, y } = this.kart.state.position;
    const angleDeg  = Phaser.Math.RadToDeg(this.kart.state.angle);

    this.sprite.setPosition(x, y).setAngle(angleDeg);
    this.shadow.setPosition(x + 4, y + 6).setAngle(angleDeg);
    this.nameTag?.setPosition(x, y + NAME_OFFSET_Y);

    // Visual state tints
    if (this.kart.isSpinning()) {
      this.sprite.setTint(SPIN_TINT).setScale(1.0);
    } else if (this.kart.isBoosting()) {
      this.sprite.setTint(BOOST_TINT).setScale(1.06);
    } else if (this.kart.state.isDrifting) {
      this.sprite.setTint(DRIFT_TINT).setScale(1.0);
    } else {
      this.sprite.setTint(NORMAL_TINT).setScale(1.0);
    }
  }

  showMiniTurbo(): void {
    const ring = this.scene.add
      .circle(this.kart.state.position.x, this.kart.state.position.y, 30, 0x7FDDFF, 0.85)
      .setDepth(12);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 3, scaleY: 3,
      alpha: 0,
      duration: 420,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
    this.nameTag?.destroy();
  }
}
