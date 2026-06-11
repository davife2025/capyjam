import {
  stepKartPhysics,
  createKartState,
  applySpinOut,
  applyBoost,
  type KartState,
  type KartInput,
  type SurfaceType,
} from "./Physics";
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

  // Race tracking
  currentLap        = 0;
  totalLaps:          number;
  lapTimes:           number[] = [];
  lapData:            LapData;
  raceStartTime       = 0;
  finishTime:         number | null = null;
  racePosition        = 0;
  progressDistance    = 0; // total distance along track path (for position sorting)

  // Power-ups
  heldPowerUp:   PowerUpType | null = null;
  activeEffect:  PowerUpEffect | null = null;
  invincibleUntil = 0;

  // Interpolation (remote players)
  prevState:           KartState;
  targetState:         KartState;
  interpolationAlpha   = 0;
  isRemote             = false;

  constructor(config: CapyKartConfig, totalLaps = 3) {
    this.id        = config.id;
    this.playerId  = config.playerId;
    this.skin      = config.skin;
    this.totalLaps = totalLaps;
    this.state     = createKartState(config.startX, config.startY, config.startAngle);
    this.prevState  = { ...this.state, position: { ...this.state.position }, velocity: { ...this.state.velocity } };
    this.targetState = { ...this.state, position: { ...this.state.position }, velocity: { ...this.state.velocity } };
    this.lapData   = { lap: 0, startTime: 0, checkpointsPassed: new Set() };
  }

  update(dt: number, surfaceType: SurfaceType = "road"): void {
    if (this.isRemote) {
      this.interpolate(dt);
      return;
    }

    // Tick active power-up effect
    if (this.activeEffect) {
      this.activeEffect.remainingMs -= dt * 1000;
      if (this.activeEffect.remainingMs <= 0) this.activeEffect = null;
    }

    // Override surface for certain effects
    let finalSurface: SurfaceType = surfaceType;
    if (this.activeEffect?.type === "mud-splash") finalSurface = "mud";
    if (this.activeEffect?.type === "star")       finalSurface = "boost";

    this.state = stepKartPhysics(this.state, this.input, dt, finalSurface);
  }

  passCheckpoint(index: number, _total: number, _now: number): void {
    this.lapData.checkpointsPassed.add(index);
  }

  completeLap(now: number): boolean {
    // Must have passed at least 1 checkpoint to prevent shortcut finish
    if (this.lapData.checkpointsPassed.size === 0) return false;

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
        this.state = applyBoost(this.state, 2.5);
        break;
      case "nitro":
        this.state = applyBoost(this.state, 4.0);
        break;
      case "star":
        this.activeEffect = { type, remainingMs: 5000 };
        this.invincibleUntil = Date.now() + 5000;
        break;
      case "mud-splash":
        this.activeEffect = { type, remainingMs: 3000 };
        break;
      default:
        break;
    }
    return type;
  }

  hitByItem(): void {
    if (Date.now() < this.invincibleUntil) return;
    this.state = applySpinOut(this.state);
    this.activeEffect = null;
    this.invincibleUntil = Date.now() + 2000;
  }

  isSpinning(): boolean {
    return this.state.spinTimer > 0;
  }

  isBoosting(): boolean {
    return this.state.boostTimer > 0;
  }

  isFinished(): boolean {
    return this.finishTime !== null;
  }

  getBestLap(): number | null {
    if (this.lapTimes.length === 0) return null;
    return Math.min(...this.lapTimes);
  }

  getTotalRaceTime(now: number): number {
    return (this.finishTime ?? now) - this.raceStartTime;
  }

  // Remote interpolation
  receiveNetworkState(newState: KartState): void {
    this.prevState  = { ...this.state, position: { ...this.state.position }, velocity: { ...this.state.velocity } };
    this.targetState = newState;
    this.interpolationAlpha = 0;
  }

  private interpolate(dt: number): void {
    this.interpolationAlpha = Math.min(1, this.interpolationAlpha + dt * 22);
    const a = this.interpolationAlpha;
    this.state.position.x = lerp(this.prevState.position.x, this.targetState.position.x, a);
    this.state.position.y = lerp(this.prevState.position.y, this.targetState.position.y, a);
    this.state.angle       = lerpAngleSimple(this.prevState.angle, this.targetState.angle, a);
    this.state.speed       = lerp(this.prevState.speed, this.targetState.speed, a);
    this.state.isDrifting  = this.targetState.isDrifting;
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngleSimple(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
