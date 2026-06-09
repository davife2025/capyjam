// Pure physics — no Phaser dependency. Runs on server and client.

export interface Vec2 {
  x: number;
  y: number;
}

export interface KartState {
  position: Vec2;
  velocity: Vec2;
  angle: number;        // radians
  angularVel: number;
  speed: number;        // pixels/second
  isDrifting: boolean;
  driftCharge: number;  // 0–1, for mini-turbo
  isGrounded: boolean;
  surfaceType: SurfaceType;
  spinTimer: number;    // >0 = knocked out
  boostTimer: number;   // >0 = boosting
}

export type SurfaceType = "road" | "dirt" | "grass" | "boost" | "mud";

export const SURFACE_PARAMS: Record<SurfaceType, {
  friction: number;
  maxSpeed: number;
  acceleration: number;
}> = {
  road:  { friction: 0.935, maxSpeed: 520, acceleration: 820 },
  dirt:  { friction: 0.855, maxSpeed: 360, acceleration: 520 },
  grass: { friction: 0.780, maxSpeed: 260, acceleration: 380 },
  boost: { friction: 0.985, maxSpeed: 900, acceleration: 1400 },
  mud:   { friction: 0.600, maxSpeed: 160, acceleration: 240 },
};

export interface KartInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  drift: boolean;
}

const MAX_ANGULAR_VEL    = 3.4;
const TURN_SPEED         = 2.8;
const DRIFT_TURN_MULT    = 1.6;
const DRIFT_SPEED_MULT   = 0.87;
const BRAKE_FORCE        = 1600;
const SPIN_DURATION      = 1.2;  // seconds
const SPIN_ANGULAR_VEL   = 12.0;
const MINI_TURBO_SPEED   = 750;
const MINI_TURBO_DURATION = 0.8;
const DRIFT_CHARGE_RATE  = 0.9;

export function stepKartPhysics(
  state: KartState,
  input: KartInput,
  dt: number,
  surfaceType: SurfaceType = "road"
): KartState {
  const params = SURFACE_PARAMS[surfaceType];
  const s: KartState = {
    ...state,
    velocity:  { ...state.velocity },
    position:  { ...state.position },
  };

  // ── Spin-out (knocked by item) ────────────────────────────────────────────
  if (s.spinTimer > 0) {
    s.spinTimer -= dt;
    s.angle += SPIN_ANGULAR_VEL * dt;
    s.speed *= 0.92;
    s.position.x += Math.cos(s.angle) * s.speed * dt;
    s.position.y += Math.sin(s.angle) * s.speed * dt;
    return s;
  }

  // ── Boost timer ───────────────────────────────────────────────────────────
  if (s.boostTimer > 0) {
    s.boostTimer -= dt;
  }
  const effectiveMaxSpeed = s.boostTimer > 0
    ? Math.max(params.maxSpeed, MINI_TURBO_SPEED)
    : params.maxSpeed;

  // ── Steering ──────────────────────────────────────────────────────────────
  const turnDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const speedFactor = Math.min(Math.abs(s.speed) / 280, 1);
  const driftMult = s.isDrifting ? DRIFT_TURN_MULT : 1.0;
  s.angularVel += TURN_SPEED * turnDir * speedFactor * driftMult * dt;
  s.angularVel *= 0.72;
  s.angularVel = Math.max(-MAX_ANGULAR_VEL, Math.min(MAX_ANGULAR_VEL, s.angularVel));
  s.angle += s.angularVel * dt;

  // ── Drift charge ─────────────────────────────────────────────────────────
  if (s.isDrifting && Math.abs(turnDir) > 0) {
    s.driftCharge = Math.min(1, s.driftCharge + DRIFT_CHARGE_RATE * dt);
  } else if (!s.isDrifting && state.isDrifting && s.driftCharge > 0.5) {
    // Mini-turbo release
    s.boostTimer = MINI_TURBO_DURATION;
    s.driftCharge = 0;
  } else if (!s.isDrifting) {
    s.driftCharge = Math.max(0, s.driftCharge - dt * 2);
  }

  // ── Acceleration / braking ────────────────────────────────────────────────
  let accelForce = 0;
  if (input.up)   accelForce =  (s.boostTimer > 0 ? params.acceleration * 1.5 : params.acceleration);
  if (input.down) accelForce = -BRAKE_FORCE;

  s.speed += accelForce * dt;
  if (s.isDrifting) s.speed *= DRIFT_SPEED_MULT;

  s.speed *= params.friction;
  s.speed = Math.max(-effectiveMaxSpeed * 0.35, Math.min(effectiveMaxSpeed, s.speed));

  // ── Velocity → position ───────────────────────────────────────────────────
  s.velocity.x = Math.cos(s.angle) * s.speed;
  s.velocity.y = Math.sin(s.angle) * s.speed;
  s.position.x += s.velocity.x * dt;
  s.position.y += s.velocity.y * dt;

  // ── Drift state ───────────────────────────────────────────────────────────
  s.isDrifting = input.drift && s.speed > 180 && Math.abs(turnDir) > 0;
  s.surfaceType = surfaceType;

  return s;
}

export function applySpinOut(state: KartState): KartState {
  return { ...state, spinTimer: SPIN_DURATION, speed: state.speed * 0.4 };
}

export function applyBoost(state: KartState, durationSeconds: number): KartState {
  return { ...state, boostTimer: durationSeconds };
}

export function createKartState(x: number, y: number, angle = 0): KartState {
  return {
    position:   { x, y },
    velocity:   { x: 0, y: 0 },
    angle,
    angularVel: 0,
    speed:      0,
    isDrifting: false,
    driftCharge: 0,
    isGrounded: true,
    surfaceType: "road",
    spinTimer:  0,
    boostTimer: 0,
  };
}

export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

export function angleTo(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}
