import Phaser from "phaser";
import type { CapyKart } from "@capyjam/game-engine";

const SHADOW_ALPHA    = 0.35;
const DRIFT_TINT      = 0xF9CB42;
const BOOST_TINT      = 0x7FDDFF;
const SPIN_TINT       = 0xFF4444;
const NORMAL_TINT     = 0xFFFFFF;
const NAME_OFFSET_Y   = -32;

export class CapySprite {
  scene:      Phaser.Scene;
  kart:       CapyKart;
  sprite:     Phaser.GameObjects.Image;
  shadow:     Phaser.GameObjects.Image;
  nameTag:    Phaser.GameObjects.Text | null = null;
  exhaustFx:  Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  driftFx:    Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  isPlayer:   boolean;

  constructor(
    scene: Phaser.Scene,
    kart: CapyKart,
    isPlayer = false,
    displayName?: string
  ) {
    this.scene    = scene;
    this.kart     = kart;
    this.isPlayer = isPlayer;

    const { x, y } = kart.state.position;

    // Shadow (slightly offset, drawn below sprite)
    this.shadow = scene.add.image(x + 4, y + 6, kart.skin)
      .setAlpha(SHADOW_ALPHA)
      .setTint(0x000000)
      .setDepth(4)
      .setScale(1.05);

    // Main sprite
    this.sprite = scene.add.image(x, y, kart.skin)
      .setDepth(10)
      .setOrigin(0.5, 0.5);

    // Name tag for other players / AI
    if (displayName) {
      this.nameTag = scene.add.text(x, y + NAME_OFFSET_Y, displayName, {
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

    this.setupParticles();
  }

  private setupParticles(): void {
    // Exhaust smoke
    try {
      this.exhaustFx = this.scene.add.particles(0, 0, "__WHITE", {
        speed: { min: 10, max: 30 },
        angle: { min: 160, max: 200 },
        scale: { start: 0.18, end: 0 },
        alpha: { start: 0.35, end: 0 },
        lifespan: 320,
        frequency: 60,
        tint: [0xAAAAAA, 0x888888],
        maxParticles: 0,
      });
      this.exhaustFx.setDepth(9);
    } catch {
      // particles not available in this context
    }

    // Drift sparks
    try {
      this.driftFx = this.scene.add.particles(0, 0, "__WHITE", {
        speed: { min: 40, max: 100 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.12, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 200,
        frequency: -1, // manual emit
        tint: [0xF9CB42, 0xFF8800, 0xFFFFFF],
        maxParticles: 0,
      });
      this.driftFx.setDepth(9);
    } catch {
      // ignore
    }
  }

  update(): void {
    const { x, y } = this.kart.state.position;
    const angleDeg = Phaser.Math.RadToDeg(this.kart.state.angle);

    // Sprite + shadow
    this.sprite.setPosition(x, y).setAngle(angleDeg);
    this.shadow.setPosition(x + 4, y + 6).setAngle(angleDeg);

    // Name tag
    this.nameTag?.setPosition(x, y + NAME_OFFSET_Y);

    // Tint logic
    if (this.kart.isSpinning()) {
      this.sprite.setTint(SPIN_TINT);
    } else if (this.kart.isBoosting()) {
      this.sprite.setTint(BOOST_TINT);
      this.sprite.setScale(1.05);
    } else if (this.kart.state.isDrifting) {
      this.sprite.setTint(DRIFT_TINT);
      this.sprite.setScale(1.0);
    } else {
      this.sprite.setTint(NORMAL_TINT);
      this.sprite.setScale(1.0);
    }

    // Exhaust particles
    if (this.exhaustFx) {
      const behind = {
        x: x - Math.cos(this.kart.state.angle) * 20,
        y: y - Math.sin(this.kart.state.angle) * 20,
      };
      this.exhaustFx.setPosition(behind.x, behind.y);
      if (Math.abs(this.kart.state.speed) > 60) {
        this.exhaustFx.start();
      } else {
        this.exhaustFx.stop();
      }
    }

    // Drift spark burst
    if (this.driftFx && this.kart.state.isDrifting && this.kart.state.driftCharge > 0.3) {
      this.driftFx.setPosition(x, y);
      this.driftFx.emitParticle(3);
    }
  }

  showMiniTurbo(): void {
    // Flash blue ring
    const ring = this.scene.add.circle(
      this.kart.state.position.x,
      this.kart.state.position.y,
      30, 0x7FDDFF, 0.8
    ).setDepth(12);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 3, scaleY: 3,
      alpha: 0,
      duration: 400,
      onComplete: () => ring.destroy(),
    });
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
    this.nameTag?.destroy();
    this.exhaustFx?.destroy();
    this.driftFx?.destroy();
  }
}
