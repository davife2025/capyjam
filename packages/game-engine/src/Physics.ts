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
  isGrounded: boolean;
  surfaceType: SurfaceType;
}

export type SurfaceType = "road" | "dirt" | "grass" | "boost" | "mud";

export const SURFACE_PARAMS: Record<SurfaceType, {
  friction: number;
  maxSpeed: number;
  acceleration: number;
}> = {
  road:  { friction: 0.92, maxSpeed: 520, acceleration: 800 },
  dirt:  { friction: 0.85, maxSpeed: 360, acceleration: 520 },
  grass: { friction: 0.78, maxSpeed: 280, acceleration: 400 },
  boost: { friction: 0.98, maxSpeed: 820, acceleration: 1200 },
  mud:   { friction: 0.60, maxSpeed: 180, acceleration: 260 },
};

export interface KartInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  drift: boolean;
}

const MAX_ANGULAR_VEL = 3.2;
const TURN_SPEED = 2.6;
const DRIFT_TURN_MULTIPLIER = 1.5;
const DRIFT_SPEED_PENALTY = 0.88;
const BRAKE_FORCE = 1400;
const GRAVITY = 0; // top-down

export function stepKartPhysics(
  state: KartState,
  input: KartInput,
  dt: number,           // seconds
  surfaceType: SurfaceType = "road"
): KartState {
  const params = SURFACE_PARAMS[surfaceType];
  const s = { ...state, velocity: { ...state.velocity }, position: { ...state.position } };

  // ── Steering ─────────────────────────────────────────────────────────────
  const turnDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const speedFactor = Math.min(s.speed / 300, 1);
  const turnAmount = TURN_SPEED * turnDir * speedFactor * dt;
  const driftMult = s.isDrifting ? DRIFT_TURN_MULTIPLIER : 1;

  s.angularVel += turnAmount * driftMult;
  s.angularVel *= 0.75; // angular damping
  s.angularVel = Math.max(-MAX_ANGULAR_VEL, Math.min(MAX_ANGULAR_VEL, s.angularVel));
  s.angle += s.angularVel * dt;

  // ── Acceleration / braking ────────────────────────────────────────────────
  let accelForce = 0;
  if (input.up)   accelForce =  params.acceleration;
  if (input.down) accelForce = -BRAKE_FORCE;

  s.speed += accelForce * dt;

  // Drift speed penalty
  if (s.isDrifting) s.speed *= DRIFT_SPEED_PENALTY;

  // Friction + max speed clamp
  s.speed *= params.friction;
  s.speed = Math.max(-params.maxSpeed * 0.4, Math.min(params.maxSpeed, s.speed));

  // ── Velocity from speed + angle ──────────────────────────────────────────
  s.velocity.x = Math.cos(s.angle) * s.speed;
  s.velocity.y = Math.sin(s.angle) * s.speed;

  // ── Position integration ─────────────────────────────────────────────────
  s.position.x += s.velocity.x * dt;
  s.position.y += s.velocity.y * dt;

  // ── Drift state ──────────────────────────────────────────────────────────
  s.isDrifting = input.drift && s.speed > 200 && Math.abs(turnDir) > 0;
  s.surfaceType = surfaceType;

  return s;
}

export function createKartState(x: number, y: number, angle = 0): KartState {
  return {
    position: { x, y },
    velocity: { x: 0, y: 0 },
    angle,
    angularVel: 0,
    speed: 0,
    isDrifting: false,
    isGrounded: true,
    surfaceType: "road",
  };
}

export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI)  diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
