import Phaser from "phaser";
import { randomPowerUp, type PowerUpType } from "@capyjam/game-engine";
import type { Vec2 } from "@capyjam/game-engine";

const PICKUP_RADIUS  = 36;
const RESPAWN_DELAY  = 8000; // ms

export class ItemBox {
  scene:      Phaser.Scene;
  position:   Vec2;
  sprite:     Phaser.GameObjects.Image;
  glowSprite: Phaser.GameObjects.Image;
  active      = true;
  private respawnTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene    = scene;
    this.position = { x, y };

    // Glow ring (pulsing)
    this.glowSprite = scene.add.image(x, y, "item-box-glow")
      .setDepth(2)
      .setAlpha(0.5)
      .setBlendMode(Phaser.BlendModes.ADD);

    scene.tweens.add({
      targets: this.glowSprite,
      scaleX: 1.3, scaleY: 1.3,
      alpha: 0.15,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Main box sprite with bob
    this.sprite = scene.add.image(x, y, "item-box")
      .setDepth(3);

    scene.tweens.add({
      targets: this.sprite,
      y: y - 7,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Slow spin
    scene.tweens.add({
      targets: this.sprite,
      angle: 360,
      duration: 3000,
      repeat: -1,
      ease: "Linear",
    });
  }

  checkPickup(kartX: number, kartY: number): PowerUpType | null {
    if (!this.active) return null;
    const dx = kartX - this.position.x;
    const dy = kartY - this.position.y;
    if (Math.sqrt(dx * dx + dy * dy) < PICKUP_RADIUS) {
      this.collect();
      return randomPowerUp();
    }
    return null;
  }

  private collect(): void {
    this.active = false;
    this.sprite.setVisible(false);
    this.glowSprite.setVisible(false);

    // Pop effect
    const pop = this.scene.add.circle(
      this.position.x, this.position.y, 10, 0xF9CB42, 0.9
    ).setDepth(15);

    this.scene.tweens.add({
      targets: pop,
      scaleX: 4, scaleY: 4,
      alpha: 0,
      duration: 300,
      onComplete: () => pop.destroy(),
    });

    // Respawn
    this.respawnTimer = this.scene.time.delayedCall(RESPAWN_DELAY, () => {
      this.active = true;
      this.sprite.setVisible(true);
      this.glowSprite.setVisible(true);

      // Flicker-in
      this.scene.tweens.add({
        targets: [this.sprite, this.glowSprite],
        alpha: { from: 0, to: 1 },
        duration: 400,
      });
    });
  }

  destroy(): void {
    this.sprite.destroy();
    this.glowSprite.destroy();
    this.respawnTimer?.destroy();
  }
}
