import type { ReplayData, ReplayEvent } from "./ReplayRecorder";
import type { KartState } from "@capyjam/game-engine";
import { createKartState } from "@capyjam/game-engine";

type EventCallback = (event: ReplayEvent) => void;

/**
 * ReplayPlayer: given a ReplayData, provides interpolated KartState at any
 * playback time. Drives the GhostSprite during a ghost race.
 */
export class ReplayPlayer {
  private replay:     ReplayData;
  private startedAt   = 0;
  private paused      = false;
  private pausedAt    = 0;
  playbackRate = 1.0;
  private eventCursor  = 0;
  private onEvent:    EventCallback | null = null;

  // Current interpolated state (updated by tick())
  currentState: KartState;
  currentTime   = 0;
  isFinished    = false;

  constructor(replay: ReplayData) {
    this.replay = replay;

    const first = replay.frames[0];
    this.currentState = createKartState(
      first?.x ?? 0,
      first?.y ?? 0,
      first?.a ?? 0
    );
  }

  start(): void {
    this.startedAt   = performance.now();
    this.paused      = false;
    this.eventCursor = 0;
    this.isFinished  = false;
    this.currentTime = 0;
  }

  pause(): void {
    if (this.paused) return;
    this.paused  = true;
    this.pausedAt = performance.now();
  }

  resume(): void {
    if (!this.paused) return;
    this.startedAt += performance.now() - this.pausedAt;
    this.paused = false;
  }

  setPlaybackRate(rate: number): void {
    // Adjust startedAt so currentTime is continuous
    const cur  = this.currentTime;
    this.playbackRate = Math.max(0.1, Math.min(4.0, rate));
    this.startedAt = performance.now() - cur / this.playbackRate;
  }

  onEventCallback(cb: EventCallback): void {
    this.onEvent = cb;
  }

  tick(): KartState {
    if (this.paused || this.isFinished) return this.currentState;

    const wall = performance.now();
    this.currentTime = (wall - this.startedAt) * this.playbackRate;

    // Fire pending events
    while (
      this.eventCursor < this.replay.events.length &&
      this.replay.events[this.eventCursor].t <= this.currentTime
    ) {
      this.onEvent?.(this.replay.events[this.eventCursor]);
      this.eventCursor++;
    }

    // Find surrounding frames for interpolation
    const frames = this.replay.frames;
    if (frames.length === 0) return this.currentState;

    if (this.currentTime >= this.replay.totalTime) {
      this.isFinished = true;
      const last = frames[frames.length - 1];
      this.currentState = this.frameToState(last);
      return this.currentState;
    }

    // Binary search for bracket
    let lo = 0, hi = frames.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (frames[mid].t <= this.currentTime) lo = mid;
      else hi = mid;
    }

    const a  = frames[lo];
    const b  = frames[Math.min(lo + 1, frames.length - 1)];
    const span = b.t - a.t;
    const alpha = span > 0 ? Math.max(0, Math.min(1, (this.currentTime - a.t) / span)) : 1;

    this.currentState = {
      position:    { x: lerp(a.x, b.x, alpha), y: lerp(a.y, b.y, alpha) },
      velocity:    { x: 0, y: 0 },
      angle:       lerpAngle(a.a, b.a, alpha),
      angularVel:  0,
      speed:       lerp(a.s, b.s, alpha),
      isDrifting:  a.d,
      driftCharge: 0,
      isGrounded:  true,
      surfaceType: "road",
      spinTimer:   a.sp ? 0.5 : 0,
      boostTimer:  a.b  ? 0.5 : 0,
    };

    return this.currentState;
  }

  private frameToState(f: ReturnType<typeof this.replay.frames[0]>): KartState {
    return {
      position:    { x: f.x, y: f.y },
      velocity:    { x: 0, y: 0 },
      angle:       f.a,
      angularVel:  0,
      speed:       f.s,
      isDrifting:  f.d,
      driftCharge: 0,
      isGrounded:  true,
      surfaceType: "road",
      spinTimer:   f.sp ? 0.5 : 0,
      boostTimer:  f.b  ? 0.5 : 0,
    };
  }

  get progress(): number {
    return this.replay.totalTime > 0
      ? Math.min(1, this.currentTime / this.replay.totalTime)
      : 0;
  }

  get duration(): number { return this.replay.totalTime; }
  get playerName(): string { return this.replay.playerName; }
  get skinId(): string { return this.replay.skinId; }
  get lapTimes(): number[] { return this.replay.lapTimes; }
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
