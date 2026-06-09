import { CapyKart, type CapyKartConfig } from "@capyjam/game-engine";
import { angleTo, distance, type Vec2 } from "@capyjam/game-engine";
import type { SkinId } from "@capyjam/types";

export type AIDifficulty = "easy" | "medium" | "hard";

const DIFFICULTY_PARAMS: Record<AIDifficulty, {
  reactionDelay: number;   // seconds before reacting
  waypointRadius: number;  // how close to hit a waypoint
  maxSpeedMult: number;    // fraction of full speed
  steerStrength: number;   // 0–1
  usePowerUp: boolean;
}> = {
  easy:   { reactionDelay: 0.4, waypointRadius: 90,  maxSpeedMult: 0.72, steerStrength: 0.7, usePowerUp: false },
  medium: { reactionDelay: 0.2, waypointRadius: 72,  maxSpeedMult: 0.88, steerStrength: 0.88, usePowerUp: true },
  hard:   { reactionDelay: 0.0, waypointRadius: 56,  maxSpeedMult: 1.00, steerStrength: 1.00, usePowerUp: true },
};

export class AIDriver {
  kart: CapyKart;
  private difficulty: AIDifficulty;
  private params: typeof DIFFICULTY_PARAMS[AIDifficulty];
  private waypoints: Vec2[];
  private currentWaypoint = 0;
  private reactionTimer   = 0;

  // Computed input (same shape as human input)
  private targetInput = { up: true, down: false, left: false, right: false, drift: false };

  constructor(
    config: CapyKartConfig,
    waypoints: Vec2[],
    difficulty: AIDifficulty = "medium",
    totalLaps = 3
  ) {
    this.kart       = new CapyKart(config, totalLaps);
    this.waypoints  = waypoints;
    this.difficulty = difficulty;
    this.params     = DIFFICULTY_PARAMS[difficulty];
  }

  update(dt: number, surfaceType: import("@capyjam/game-engine").SurfaceType = "road"): void {
    this.reactionTimer -= dt;
    if (this.reactionTimer > 0) {
      this.kart.input = this.targetInput;
      this.kart.update(dt, surfaceType);
      return;
    }
    this.reactionTimer = this.params.reactionDelay;

    this.computeInput();
    this.kart.input = this.targetInput;

    // Use power-up if available
    if (this.params.usePowerUp && this.kart.heldPowerUp) {
      this.kart.usePowerUp();
    }

    this.kart.update(dt, surfaceType);
    this.advanceWaypoint();
  }

  private computeInput(): void {
    const pos     = this.kart.state.position;
    const target  = this.waypoints[this.currentWaypoint];
    const desired = angleTo(pos, target);
    let   diff    = desired - this.kart.state.angle;

    // Normalise to [-π, π]
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const absAngle = Math.abs(diff);
    const strength = this.params.steerStrength;

    // Steer toward waypoint
    const left  = diff < -0.08 * strength;
    const right = diff >  0.08 * strength;

    // Drift on sharp corners at speed
    const drift = absAngle > 0.6 && this.kart.state.speed > 300;

    // Slow down on very sharp turns
    const sharpTurn = absAngle > 1.0;
    const up   = !sharpTurn;
    const down =  sharpTurn && this.kart.state.speed > 200;

    // Respect difficulty speed cap via occasional brake
    const overSpeed = this.kart.state.speed > 520 * this.params.maxSpeedMult;

    this.targetInput = {
      up:    up && !overSpeed,
      down:  down || overSpeed,
      left,
      right,
      drift,
    };
  }

  private advanceWaypoint(): void {
    const pos    = this.kart.state.position;
    const target = this.waypoints[this.currentWaypoint];
    if (distance(pos, target) < this.params.waypointRadius) {
      this.currentWaypoint = (this.currentWaypoint + 1) % this.waypoints.length;
    }
  }
}

// Factory: create a set of AI opponents for a race
export function createAIDrivers(
  waypoints: Vec2[],
  startPositions: Array<Vec2 & { angle: number }>,
  skins: SkinId[],
  difficulty: AIDifficulty,
  count: number,
  totalLaps: number
): AIDriver[] {
  const drivers: AIDriver[] = [];
  const names = ["CopyBot", "CapyAI", "TurboNut", "MudBath", "BananaBot", "ZoomZoom", "SlowPoke"];

  for (let i = 0; i < count; i++) {
    const startIdx = i + 1; // player is at 0
    const start    = startPositions[startIdx] ?? startPositions[startPositions.length - 1];
    const skin     = skins[i % skins.length];

    drivers.push(
      new AIDriver(
        {
          id:          `ai-${i}`,
          playerId:    `ai-player-${i}`,
          skin,
          startX:      start.x,
          startY:      start.y,
          startAngle:  start.angle,
        },
        waypoints,
        difficulty,
        totalLaps
      )
    );
  }

  return drivers;
}
