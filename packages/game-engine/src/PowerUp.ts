import type { PowerUpType } from "@capyjam/types";

export const POWER_UP_WEIGHTS: Record<PowerUpType, number> = {
  "speed-boost": 30,
  "banana":      25,
  "shell":       20,
  "star":        5,
  "mud-splash":  15,
  "nitro":       5,
};

const TOTAL_WEIGHT = Object.values(POWER_UP_WEIGHTS).reduce((a, b) => a + b, 0);

export function randomPowerUp(): PowerUpType {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const [type, weight] of Object.entries(POWER_UP_WEIGHTS)) {
    roll -= weight;
    if (roll <= 0) return type as PowerUpType;
  }
  return "speed-boost";
}

export interface ProjectileState {
  id: string;
  type: "banana" | "shell" | "mud-splash";
  x: number;
  y: number;
  angle: number;
  speed: number;
  ownerId: string;
  active: boolean;
}

export function stepProjectile(proj: ProjectileState, dt: number): ProjectileState {
  if (!proj.active) return proj;
  return {
    ...proj,
    x: proj.x + Math.cos(proj.angle) * proj.speed * dt,
    y: proj.y + Math.sin(proj.angle) * proj.speed * dt,
  };
}

export function checkProjectileHit(
  proj: ProjectileState,
  kartX: number,
  kartY: number,
  hitRadius = 28
): boolean {
  if (!proj.active) return false;
  const dx = proj.x - kartX;
  const dy = proj.y - kartY;
  return Math.sqrt(dx * dx + dy * dy) < hitRadius;
}

export const POWER_UP_DISPLAY: Record<PowerUpType, { emoji: string; label: string; color: string }> = {
  "speed-boost": { emoji: "⚡", label: "Speed Boost", color: "#F9CB42" },
  "banana":      { emoji: "🍌", label: "Banana Peel", color: "#EF9F27" },
  "shell":       { emoji: "🐚", label: "Shell",        color: "#5DCAA5" },
  "star":        { emoji: "⭐", label: "Star",         color: "#F9CB42" },
  "mud-splash":  { emoji: "💦", label: "Mud Splash",   color: "#639922" },
  "nitro":       { emoji: "🔥", label: "Nitro",        color: "#E24B4A" },
};
