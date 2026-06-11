import Phaser from "phaser";

/**
 * ParticleManager: centralizes all particle effects used during a race.
 * Generates its own textures so no asset files are needed.
 */
export class ParticleManager {
  private scene: Phaser.Scene;

  private exhaustEmitter:  Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private boostEmitter:    Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private driftEmitter:    Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private confettiEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.ensureTextures();
    this.setupEmitters();
  }

  private ensureTextures(): void {
    const scene = this.scene;

    if (!scene.textures.exists("particle-dot")) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff);
      g.fillCircle(4, 4, 4);
      g.generateTexture("particle-dot", 8, 8);
      g.destroy();
    }

    if (!scene.textures.exists("particle-spark")) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff);
      g.fillRect(0, 0, 6, 2);
      g.generateTexture("particle-spark", 6, 2);
      g.destroy();
    }

    if (!scene.textures.exists("particle-confetti")) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff);
      g.fillRect(0, 0, 5, 8);
      g.generateTexture("particle-confetti", 5, 8);
      g.destroy();
    }
  }

  private setupEmitters(): void {
    const scene = this.scene;

    // Exhaust smoke (idle/driving)
    this.exhaustEmitter = scene.add.particles(0, 0, "particle-dot", {
      speed:    { min: 8, max: 25 },
      angle:    { min: 150, max: 210 },
      scale:    { start: 0.5, end: 0 },
      alpha:    { start: 0.3, end: 0 },
      lifespan: 350,
      frequency: 80,
      tint:     [0x999999, 0x777777],
      emitting: false,
    }).setDepth(7);

    // Boost flame trail
    this.boostEmitter = scene.add.particles(0, 0, "particle-spark", {
      speed:    { min: 80, max: 180 },
      angle:    { min: 165, max: 195 },
      scale:    { start: 1.2, end: 0 },
      alpha:    { start: 0.9, end: 0 },
      lifespan: 250,
      frequency: 16,
      tint:     [0x7FDDFF, 0xFFFFFF, 0xF9CB42],
      emitting: false,
    }).setDepth(8);

    // Drift sparks
    this.driftEmitter = scene.add.particles(0, 0, "particle-spark", {
      speed:    { min: 60, max: 140 },
      angle:    { min: 0, max: 360 },
      scale:    { start: 0.9, end: 0 },
      alpha:    { start: 1, end: 0 },
      lifespan: 220,
      frequency: -1,
      tint:     [0xF9CB42, 0xFF8800, 0xFFFFFF],
      emitting: false,
    }).setDepth(8);

    // Finish confetti
    this.confettiEmitter = scene.add.particles(0, 0, "particle-confetti", {
      speed:    { min: 200, max: 450 },
      angle:    { min: 240, max: 300 },
      gravityY: 400,
      scale:    { start: 1, end: 0.6 },
      rotate:   { start: 0, end: 360 },
      alpha:    { start: 1, end: 0 },
      lifespan: 1800,
      frequency: -1,
      tint:     [0xF9CB42, 0xE24B4A, 0x7FDDFF, 0x5DCAA5, 0xC4965A],
      emitting: false,
    }).setDepth(300).setScrollFactor(0);
  }

  // ── Continuous effects (call every frame) ─────────────────────────────────

  updateExhaust(x: number, y: number, angle: number, speed: number): void {
    if (!this.exhaustEmitter) return;
    const behindX = x - Math.cos(angle) * 20;
    const behindY = y - Math.sin(angle) * 20;
    this.exhaustEmitter.setPosition(behindX, behindY);

    if (Math.abs(speed) > 60) {
      this.exhaustEmitter.start();
    } else {
      this.exhaustEmitter.stop();
    }
  }

  updateBoost(x: number, y: number, angle: number, isBoosting: boolean): void {
    if (!this.boostEmitter) return;
    const behindX = x - Math.cos(angle) * 24;
    const behindY = y - Math.sin(angle) * 24;
    this.boostEmitter.setPosition(behindX, behindY);
    this.boostEmitter.setRotation(angle);

    if (isBoosting) this.boostEmitter.start();
    else this.boostEmitter.stop();
  }

  emitDriftSparks(x: number, y: number, count = 2): void {
    this.driftEmitter?.setPosition(x, y);
    this.driftEmitter?.emitParticle(count);
  }

  // ── One-shot effects ─────────────────────────────────────────────────────

  emitImpact(x: number, y: number): void {
    const burst = this.scene.add.particles(x, y, "particle-spark", {
      speed:    { min: 100, max: 250 },
      angle:    { min: 0, max: 360 },
      scale:    { start: 1.2, end: 0 },
      alpha:    { start: 1, end: 0 },
      lifespan: 300,
      quantity: 12,
      tint:     [0xFF4444, 0xFFFFFF],
    }).setDepth(20);

    this.scene.time.delayedCall(350, () => burst.destroy());
  }

  emitItemPickup(x: number, y: number): void {
    const burst = this.scene.add.particles(x, y, "particle-dot", {
      speed:    { min: 60, max: 140 },
      angle:    { min: 0, max: 360 },
      scale:    { start: 0.8, end: 0 },
      alpha:    { start: 1, end: 0 },
      lifespan: 400,
      quantity: 10,
      tint:     [0xFFD700, 0xFFFFFF],
    }).setDepth(20);

    this.scene.time.delayedCall(450, () => burst.destroy());
  }

  celebrateFinish(): void {
    if (!this.confettiEmitter) return;
    const W = this.scene.scale.width;

    this.confettiEmitter.setPosition(W * 0.2, -20);
    this.confettiEmitter.explode(40);

    this.scene.time.delayedCall(150, () => {
      this.confettiEmitter?.setPosition(W * 0.5, -20);
      this.confettiEmitter?.explode(40);
    });
    this.scene.time.delayedCall(300, () => {
      this.confettiEmitter?.setPosition(W * 0.8, -20);
      this.confettiEmitter?.explode(40);
    });
  }

  destroy(): void {
    this.exhaustEmitter?.destroy();
    this.boostEmitter?.destroy();
    this.driftEmitter?.destroy();
    this.confettiEmitter?.destroy();
  }
}
