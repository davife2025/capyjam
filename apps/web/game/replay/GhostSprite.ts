import Phaser from "phaser";
import type { ReplayPlayer } from "./ReplayPlayer";

/**
 * GhostSprite: renders the ghost kart from a ReplayPlayer.
 * Semi-transparent, no shadow, shows player name above.
 * Visually distinct from live karts so it doesn't confuse the player.
 */
export class GhostSprite {
  private scene:   Phaser.Scene;
  private player:  ReplayPlayer;
  sprite:  Phaser.GameObjects.Image;
  private label:   Phaser.GameObjects.Text;
  private timeTxt: Phaser.GameObjects.Text;
  private trailPts: Array<{ x: number; y: number; alpha: number }> = [];
  private trailGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, player: ReplayPlayer) {
    this.scene  = scene;
    this.player = player;

    const skin = player.skinId;
    const startState = player.currentState;

    // Ghostly semi-transparent sprite
    this.sprite = scene.add
      .image(startState.position.x, startState.position.y, skin)
      .setAlpha(0.45)
      .setTint(0xAAAAAA)
      .setDepth(8)
      .setOrigin(0.5);

    // Name tag
    this.label = scene.add
      .text(startState.position.x, startState.position.y - 36, `👻 ${player.playerName}`, {
        fontSize: "11px",
        color: "#cccccc",
        stroke: "#000000",
        strokeThickness: 3,
        fontFamily: "system-ui",
        resolution: 2,
      })
      .setOrigin(0.5, 1)
      .setAlpha(0.75)
      .setDepth(9);

    // Ghost time display (shows how far ahead/behind)
    this.timeTxt = scene.add
      .text(startState.position.x, startState.position.y - 50, "", {
        fontSize: "10px",
        color: "#7FDDFF",
        stroke: "#000000",
        strokeThickness: 2,
        fontFamily: "monospace",
        resolution: 2,
      })
      .setOrigin(0.5, 1)
      .setAlpha(0.85)
      .setDepth(9);

    // Trail graphics
    this.trailGfx = scene.add.graphics().setDepth(7);
  }

  /**
   * Call every frame.
   * @param playerRaceTimeMs - live player's current race time for delta display
   */
  update(playerRaceTimeMs?: number): void {
    const state = this.player.tick();
    const { x, y } = state.position;
    const angleDeg  = Phaser.Math.RadToDeg(state.angle);

    // Sprite
    this.sprite.setPosition(x, y).setAngle(angleDeg);

    // Slightly redder tint when ghost is spinning
    this.sprite.setTint(state.spinTimer > 0 ? 0xFF8888 : 0xCCCCCC);

    // Labels
    this.label.setPosition(x, y - 36);
    this.timeTxt.setPosition(x, y - 50);

    // Time delta vs live player
    if (playerRaceTimeMs !== undefined) {
      const delta = this.player.currentTime - playerRaceTimeMs;
      const sign  = delta > 0 ? "+" : "";
      const secs  = (Math.abs(delta) / 1000).toFixed(2);
      this.timeTxt
        .setText(`${sign}${delta < 0 ? "-" : ""}${secs}s`)
        .setColor(delta > 0 ? "#FF8888" : "#88FF88");
    }

    // Ghost trail
    this.trailPts.unshift({ x, y, alpha: 0.3 });
    if (this.trailPts.length > 18) this.trailPts.pop();

    this.trailGfx.clear();
    this.trailPts.forEach((pt, i) => {
      const a = (1 - i / this.trailPts.length) * 0.25;
      this.trailGfx.fillStyle(0xAAAAFF, a);
      const r = 4 - i * 0.18;
      if (r > 0.5) this.trailGfx.fillCircle(pt.x, pt.y, r);
    });
  }

  destroy(): void {
    this.sprite.destroy();
    this.label.destroy();
    this.timeTxt.destroy();
    this.trailGfx.destroy();
  }
}
