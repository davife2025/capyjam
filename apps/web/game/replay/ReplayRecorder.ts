import type { KartState } from "@capyjam/game-engine";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReplayFrame {
  t:  number;   // ms since race start
  x:  number;
  y:  number;
  a:  number;   // angle (radians)
  s:  number;   // speed
  d:  boolean;  // isDrifting
  b:  boolean;  // isBoosting
  sp: boolean;  // isSpinning
}

export interface ReplayEvent {
  t:    number;
  type: "lap" | "item-pickup" | "item-use" | "hit" | "finish";
  data?: Record<string, unknown>;
}

export interface ReplayTrack {
  id:        string;
  name:      string;
  width:     number;
  height:    number;
}

export interface ReplayData {
  version:     number;         // format version for future migration
  id:          string;         // UUID
  trackId:     string;
  trackName:   string;
  playerName:  string;
  skinId:      string;
  frames:      ReplayFrame[];  // sampled at RECORD_HZ
  events:      ReplayEvent[];
  totalTime:   number;         // ms
  lapTimes:    number[];
  totalLaps:   number;
  finishPos:   number;
  recordedAt:  number;         // unix ms
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RECORD_HZ     = 24;          // frames per second to record
const RECORD_MS     = 1000 / RECORD_HZ;
const MAX_DURATION  = 12 * 60 * 1000; // 12 minutes max

// ── Recorder ─────────────────────────────────────────────────────────────────

export class ReplayRecorder {
  private frames:      ReplayFrame[]  = [];
  private events:      ReplayEvent[]  = [];
  private startTime    = 0;
  private lastFrameAt  = 0;
  private recording    = false;
  private trackId      = "";
  private trackName    = "";
  private totalLaps    = 3;

  start(trackId: string, trackName: string, totalLaps: number): void {
    this.frames     = [];
    this.events     = [];
    this.startTime  = performance.now();
    this.lastFrameAt = 0;
    this.recording  = true;
    this.trackId    = trackId;
    this.trackName  = trackName;
    this.totalLaps  = totalLaps;
  }

  tick(state: KartState): void {
    if (!this.recording) return;

    const now     = performance.now();
    const elapsed = now - this.startTime;

    if (elapsed > MAX_DURATION) {
      this.recording = false;
      return;
    }

    if (elapsed - this.lastFrameAt < RECORD_MS) return;
    this.lastFrameAt = elapsed;

    this.frames.push({
      t:  Math.round(elapsed),
      x:  Math.round(state.position.x * 10) / 10,
      y:  Math.round(state.position.y * 10) / 10,
      a:  Math.round(state.angle * 1000) / 1000,
      s:  Math.round(state.speed * 10) / 10,
      d:  state.isDrifting,
      b:  state.boostTimer > 0,
      sp: state.spinTimer > 0,
    });
  }

  recordEvent(type: ReplayEvent["type"], data?: Record<string, unknown>): void {
    if (!this.recording) return;
    this.events.push({
      t:    Math.round(performance.now() - this.startTime),
      type,
      data,
    });
  }

  stop(
    playerName: string,
    skinId:     string,
    totalTime:  number,
    lapTimes:   number[],
    finishPos:  number
  ): ReplayData {
    this.recording = false;

    return {
      version:    1,
      id:         crypto.randomUUID(),
      trackId:    this.trackId,
      trackName:  this.trackName,
      playerName,
      skinId,
      frames:     this.frames,
      events:     this.events,
      totalTime,
      lapTimes,
      totalLaps:  this.totalLaps,
      finishPos,
      recordedAt: Date.now(),
    };
  }

  get isRecording(): boolean { return this.recording; }
  get frameCount():  number  { return this.frames.length; }

  // Estimate uncompressed size in bytes
  get estimatedSizeKB(): number {
    return Math.round(this.frames.length * 32 / 1024);
  }
}

// ── Delta compression ─────────────────────────────────────────────────────────
// Reduces replay size by ~60% before saving

interface DeltaFrame {
  t:   number;
  dx?: number;  // omit if 0
  dy?: number;
  da?: number;
  ds?: number;
  f?:  number;  // flags: bit0=drifting bit1=boosting bit2=spinning
}

export interface CompressedReplay {
  version:    number;
  id:         string;
  trackId:    string;
  trackName:  string;
  playerName: string;
  skinId:     string;
  origin:     { x: number; y: number; a: number; s: number };
  frames:     DeltaFrame[];
  events:     ReplayEvent[];
  totalTime:  number;
  lapTimes:   number[];
  totalLaps:  number;
  finishPos:  number;
  recordedAt: number;
}

export function compressReplay(replay: ReplayData): CompressedReplay {
  if (replay.frames.length === 0) {
    return { ...replay, origin: { x: 0, y: 0, a: 0, s: 0 }, frames: [] };
  }

  const first  = replay.frames[0];
  const origin = { x: first.x, y: first.y, a: first.a, s: first.s };

  const deltas: DeltaFrame[] = [{ t: first.t }];

  for (let i = 1; i < replay.frames.length; i++) {
    const prev = replay.frames[i - 1];
    const cur  = replay.frames[i];

    const df: DeltaFrame = { t: cur.t - prev.t };
    const dx = Math.round((cur.x - prev.x) * 10) / 10;
    const dy = Math.round((cur.y - prev.y) * 10) / 10;
    const da = Math.round((cur.a - prev.a) * 1000) / 1000;
    const ds = Math.round((cur.s - prev.s) * 10) / 10;

    if (dx !== 0) df.dx = dx;
    if (dy !== 0) df.dy = dy;
    if (da !== 0) df.da = da;
    if (ds !== 0) df.ds = ds;

    const flags = (cur.d ? 1 : 0) | (cur.b ? 2 : 0) | (cur.sp ? 4 : 0);
    const prevFlags = (prev.d ? 1 : 0) | (prev.b ? 2 : 0) | (prev.sp ? 4 : 0);
    if (flags !== prevFlags) df.f = flags;

    deltas.push(df);
  }

  return { ...replay, origin, frames: deltas };
}

export function decompressReplay(compressed: CompressedReplay): ReplayData {
  if (compressed.frames.length === 0) {
    return { ...compressed, frames: [] };
  }

  const frames: ReplayFrame[] = [];
  let t = 0, x = compressed.origin.x, y = compressed.origin.y;
  let a = compressed.origin.a, s = compressed.origin.s;
  let flags = 0;

  for (const df of compressed.frames) {
    t += df.t;
    x  = Math.round((x + (df.dx ?? 0)) * 10) / 10;
    y  = Math.round((y + (df.dy ?? 0)) * 10) / 10;
    a  = Math.round((a + (df.da ?? 0)) * 1000) / 1000;
    s  = Math.round((s + (df.ds ?? 0)) * 10) / 10;
    if (df.f !== undefined) flags = df.f;

    frames.push({
      t,
      x, y, a, s,
      d:  !!(flags & 1),
      b:  !!(flags & 2),
      sp: !!(flags & 4),
    });
  }

  return { ...compressed, frames };
}
