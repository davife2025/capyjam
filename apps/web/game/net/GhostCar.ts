import Phaser from "phaser";
import { CapyKart } from "@capyjam/game-engine";
import { CapySprite } from "@/game/objects/CapySprite";
import type { SkinId } from "@capyjam/types";
import type { KartState } from "@capyjam/game-engine";
import { v4 as uuid } from "uuid";

export interface RemoteKartState {
  x:          number;
  y:          number;
  angle:      number;
  speed:      number;
  isDrifting: boolean;
  spinTimer?: number;
  boostTimer?: number;
}

/**
 * GhostCar: represents a remote player in the scene.
 * Receives server state at ~20Hz and interpolates smoothly between snapshots.
 */
export class GhostCar {
  playerId:    string;
  username:    string;
  kart:        CapyKart;
  sprite:      CapySprite;

  // Snapshot ring buffer (last 3 states for smooth interpolation)
  private snapshots: Array<{ state: RemoteKartState; receivedAt: number }> = [];
  private readonly RENDER_DELAY_MS = 100; // render 100ms behind to smooth jitter

  constructor(
    scene:      Phaser.Scene,
    playerId:   string,
    username:   string,
    skin:       SkinId,
    startX = 0,
    startY = 0
  ) {
    this.playerId = playerId;
    this.username = username;

    // Kart is used only for state storage + sprite rendering
    this.kart = new CapyKart({
      id:         uuid(),
      playerId,
      skin,
      startX,
      startY,
      startAngle: 0,
    }, 3);
    this.kart.isRemote = true;

    this.sprite = new CapySprite(scene, this.kart, false, username);
  }

  receiveState(state: RemoteKartState): void {
    this.snapshots.push({ state, receivedAt: performance.now() });
    // Keep only last 4 snapshots
    if (this.snapshots.length > 4) this.snapshots.shift();
  }

  update(dt: number): void {
    const now     = performance.now();
    const renderAt = now - this.RENDER_DELAY_MS;

    // Find the two snapshots surrounding renderAt
    let before = this.snapshots[0];
    let after  = this.snapshots[1];

    for (let i = 0; i < this.snapshots.length - 1; i++) {
      if (this.snapshots[i].receivedAt <= renderAt && this.snapshots[i + 1].receivedAt >= renderAt) {
        before = this.snapshots[i];
        after  = this.snapshots[i + 1];
        break;
      }
    }

    if (!before) return;

    // If we have two snapshots, interpolate; else extrapolate from last
    if (after && after !== before) {
      const span = after.receivedAt - before.receivedAt;
      const t    = span > 0 ? (renderAt - before.receivedAt) / span : 1;
      const alpha = Math.max(0, Math.min(1, t));

      this.kart.state.position.x = lerp(before.state.x, after.state.x, alpha);
      this.kart.state.position.y = lerp(before.state.y, after.state.y, alpha);
      this.kart.state.angle      = lerpAngle(before.state.angle, after.state.angle, alpha);
      this.kart.state.speed      = lerp(before.state.speed, after.state.speed, alpha);
      this.kart.state.isDrifting = after.state.isDrifting;
    } else {
      // Extrapolate from last known state
      const last = (after ?? before).state;
      const elapsed = (now - (after ?? before).receivedAt) / 1000;
      this.kart.state.position.x = last.x + Math.cos(last.angle) * last.speed * elapsed;
      this.kart.state.position.y = last.y + Math.sin(last.angle) * last.speed * elapsed;
      this.kart.state.angle      = last.angle;
      this.kart.state.speed      = last.speed;
      this.kart.state.isDrifting = last.isDrifting;
    }

    this.sprite.update();
  }

  destroy(): void {
    this.sprite.destroy();
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
