import { stepKartPhysics, createKartState, type KartState, type KartInput, type SurfaceType } from "./Physics";
import type { PowerUpType, SkinId } from "@capyjam/types";

export interface CapyKartConfig {
  id: string;
  playerId: string;
  skin: SkinId;
  startX: number;
  startY: number;
  startAngle: number;
}

export interface PowerUpEffect {
  type: PowerUpType;
  remainingMs: number;
}

export interface LapData {
  lap: number;
  startTime: number;
  checkpointsPassed: Set<number>;
}

export class CapyKart {
  id: string;
  playerId: string;
  skin: SkinId;
  state: KartState;
  input: KartInput = { up: false, down: false, left: false, right: false, drift: false };

  // Race state
  currentLap = 0;
  totalLaps: number;
  lapTimes: number[] = [];
  lapData: LapData;
  raceStartTime = 0;
  finishTime: number | null = null;
  position = 0; // race position (1st, 2nd, etc.)

  // Power-ups
  heldPowerUp: PowerUpType | null = null;
  activeEffect: PowerUpEffect | null = null;
  invincibleUntil = 0;

  // Interpolation (for remote players)
  prevState: KartState;
  targetState: KartState;
  interpolationAlpha = 0;

  constructor(config: CapyKartConfig, totalLaps = 3) {
    this.id = config.id;
    this.playerId = config.playerId;
    this.skin = config.skin;
    this.totalLaps = totalLaps;
    this.state = createKartState(config.startX, config.startY, config.startAngle);
    this.prevState = { ...this.state, position: { ...this.state.position }, velocity: { ...this.state.velocity } };
    this.targetState = { ...this.state, position: { ...this.state.position }, velocity: { ...this.state.velocity } };
    this.lapData = { lap: 0, startTime: 0, checkpointsPassed: new Set() };
  }

  update(dt: number, surfaceType: SurfaceType = "road"): void {
    // Apply active effects
    if (this.activeEffect) {
      this.activeEffect.remainingMs -= dt * 1000;
      if (this.activeEffect.remainingMs <= 0) {
        this.activeEffect = null;
      }
    }

    // Mud debuff overrides surface
    const effectiveSurface: SurfaceType =
      this.activeEffect?.type === "mud-splash" ? "mud" : surfaceType;

    // Star = boost surface
    const finalSurface: SurfaceType =
      this.activeEffect?.type === "star" ? "boost" : effectiveSurface;

    this.state = stepKartPhysics(this.state, this.input, dt, finalSurface);
  }

  passCheckpoint(checkpointIndex: number, totalCheckpoints: number, now: number): void {
    if (this.lapData.checkpointsPassed.has(checkpointIndex)) return;
    this.lapData.checkpointsPassed.add(checkpointIndex);

    // All checkpoints passed — allow finish line
    if (this.lapData.checkpointsPassed.size >= totalCheckpoints) {
      // Finish line logic is handled externally
    }
  }

  completeLap(now: number): boolean {
    if (this.lapData.checkpointsPassed.size === 0) return false; // didn't pass checkpoints

    const lapTime = now - (this.lapData.startTime || this.raceStartTime);
    this.lapTimes.push(lapTime);
    this.currentLap++;
    this.lapData = { lap: this.currentLap, startTime: now, checkpointsPassed: new Set() };

    if (this.currentLap >= this.totalLaps) {
      this.finishTime = now;
      return true;
    }
    return false;
  }

  pickUpPowerUp(type: PowerUpType): void {
    this.heldPowerUp = type;
  }

  usePowerUp(): PowerUpType | null {
    if (!this.heldPowerUp) return null;
    const type = this.heldPowerUp;
    this.heldPowerUp = null;

    switch (type) {
      case "speed-boost":
      case "nitro":
        this.activeEffect = { type, remainingMs: 3000 };
        break;
      case "star":
        this.activeEffect = { type, remainingMs: 5000 };
        this.invincibleUntil = Date.now() + 5000;
        break;
      default:
        break;
    }

    return type;
  }

  isFinished(): boolean {
    return this.finishTime !== null;
  }

  getTotalRaceTime(now: number): number {
    return (this.finishTime ?? now) - this.raceStartTime;
  }

  // For interpolation of remote players
  receiveNetworkState(newState: KartState): void {
    this.prevState = { ...this.state, position: { ...this.state.position }, velocity: { ...this.state.velocity } };
    this.targetState = newState;
    this.interpolationAlpha = 0;
  }

  interpolate(dt: number): void {
    this.interpolationAlpha = Math.min(1, this.interpolationAlpha + dt * 20);
    const a = this.interpolationAlpha;
    this.state.position.x = this.prevState.position.x + (this.targetState.position.x - this.prevState.position.x) * a;
    this.state.position.y = this.prevState.position.y + (this.targetState.position.y - this.prevState.position.y) * a;
    this.state.angle = this.prevState.angle + (this.targetState.angle - this.prevState.angle) * a;
    this.state.speed = this.prevState.speed + (this.targetState.speed - this.prevState.speed) * a;
  }
}
