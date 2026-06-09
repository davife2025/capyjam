import { z } from "zod";

// ── Player ──────────────────────────────────────────────────────────────────

export const PlayerSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(2).max(24),
  skin: z.string().default("capy-default"),
  xp: z.number().int().default(0),
  elo: z.number().int().default(1000),
  isGuest: z.boolean().default(true),
});

export type Player = z.infer<typeof PlayerSchema>;

// ── Race ────────────────────────────────────────────────────────────────────

export const RaceStatusSchema = z.enum([
  "waiting",
  "countdown",
  "racing",
  "finished",
]);
export type RaceStatus = z.infer<typeof RaceStatusSchema>;

export const RaceResultSchema = z.object({
  playerId: z.string(),
  position: z.number().int(),
  lapTimes: z.array(z.number()),
  totalTime: z.number(),
  finishedAt: z.date().nullable(),
});
export type RaceResult = z.infer<typeof RaceResultSchema>;

export const RaceSchema = z.object({
  id: z.string().uuid(),
  trackId: z.string().uuid(),
  status: RaceStatusSchema,
  players: z.array(PlayerSchema),
  results: z.array(RaceResultSchema),
  createdAt: z.date(),
  startedAt: z.date().nullable(),
  finishedAt: z.date().nullable(),
  maxPlayers: z.number().int().default(8),
  totalLaps: z.number().int().default(3),
});
export type Race = z.infer<typeof RaceSchema>;

// ── Track ───────────────────────────────────────────────────────────────────

export const TrackTileSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  type: z.enum([
    "road",
    "dirt",
    "grass",
    "boost",
    "mud",
    "checkpoint",
    "finish",
    "start",
    "item-box",
  ]),
  rotation: z.number().default(0),
});
export type TrackTile = z.infer<typeof TrackTileSchema>;

export const TrackSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(48),
  authorId: z.string().uuid().nullable(),
  tiles: z.array(TrackTileSchema),
  width: z.number().int(),
  height: z.number().int(),
  checkpoints: z.array(z.object({ x: z.number(), y: z.number() })),
  startPositions: z.array(z.object({ x: z.number(), y: z.number(), angle: z.number() })),
  published: z.boolean().default(false),
  plays: z.number().int().default(0),
  rating: z.number().default(0),
  createdAt: z.date(),
});
export type Track = z.infer<typeof TrackSchema>;

// ── Power-ups ────────────────────────────────────────────────────────────────

export const PowerUpTypeSchema = z.enum([
  "speed-boost",
  "banana",
  "shell",
  "star",
  "mud-splash",
  "nitro",
]);
export type PowerUpType = z.infer<typeof PowerUpTypeSchema>;

// ── Skins ────────────────────────────────────────────────────────────────────

export const SKINS = [
  { id: "capy-default", name: "Classic Capy", xpRequired: 0 },
  { id: "capy-racer", name: "Racer Capy", xpRequired: 500 },
  { id: "capy-pirate", name: "Pirate Capy", xpRequired: 1200 },
  { id: "capy-astronaut", name: "Astronaut Capy", xpRequired: 2500 },
  { id: "capy-samurai", name: "Samurai Capy", xpRequired: 5000 },
] as const;

export type SkinId = (typeof SKINS)[number]["id"];

// ── WebSocket Messages ────────────────────────────────────────────────────────

export const WsMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("join-room"), roomId: z.string(), player: PlayerSchema }),
  z.object({ type: z.literal("player-ready"), playerId: z.string() }),
  z.object({ type: z.literal("player-input"), playerId: z.string(), input: z.object({
    up: z.boolean(), down: z.boolean(), left: z.boolean(), right: z.boolean(), drift: z.boolean(),
  })}),
  z.object({ type: z.literal("game-state"), state: z.any() }),
  z.object({ type: z.literal("race-start"), countdownMs: z.number() }),
  z.object({ type: z.literal("race-finish"), results: z.array(RaceResultSchema) }),
  z.object({ type: z.literal("player-joined"), player: PlayerSchema }),
  z.object({ type: z.literal("player-left"), playerId: z.string() }),
  z.object({ type: z.literal("chat"), playerId: z.string(), message: z.string() }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);
export type WsMessage = z.infer<typeof WsMessageSchema>;
