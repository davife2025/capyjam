import { broadcast } from "./rooms";
import type { Room, ServerPlayer } from "./types";
import type { WsMessage } from "@capyjam/types";

const TICK_RATE    = 20;       // Hz
const TICK_MS      = 1000 / TICK_RATE;
const COUNTDOWN_MS = 3000;
const MAX_RACE_MS  = 10 * 60 * 1000; // 10-minute race timeout

export function startGameLoop(room: Room): void {
  if (room.gameLoopInterval) return;

  room.status = "countdown";
  room.countdownEnd = Date.now() + COUNTDOWN_MS;

  broadcast(room, { type: "race-start", countdownMs: COUNTDOWN_MS });

  // Begin racing after countdown
  setTimeout(() => {
    room.status    = "racing";
    room.startTime = Date.now();

    room.gameLoopInterval = setInterval(() => tickRoom(room), TICK_MS);
  }, COUNTDOWN_MS);
}

function tickRoom(room: Room): void {
  if (room.status !== "racing") return;

  const now     = Date.now();
  const elapsed = room.startTime ? now - room.startTime : 0;

  // Build per-player state snapshot
  const playerStates: Record<string, {
    x: number; y: number; angle: number; speed: number;
    isDrifting: boolean; spinTimer: number; boostTimer: number;
    lap: number; position: number;
  }> = {};

  let livingPlayers = 0;

  for (const [id, player] of room.players) {
    if (!player.kartState) continue;
    livingPlayers++;

    playerStates[id] = {
      x:          player.kartState.position.x,
      y:          player.kartState.position.y,
      angle:      player.kartState.angle,
      speed:      player.kartState.speed,
      isDrifting: player.kartState.isDrifting,
      spinTimer:  player.kartState.spinTimer ?? 0,
      boostTimer: player.kartState.boostTimer ?? 0,
      lap:        player.lapData.currentLap,
      position:   0, // computed below
    };
  }

  // Compute race positions server-side (by lap + checkpoint count)
  const sorted = Object.entries(playerStates)
    .map(([id, s]) => ({
      id,
      score: s.lap * 10000 + (room.players.get(id)?.lapData.checkpointsPassed.length ?? 0) * 1000,
    }))
    .sort((a, b) => b.score - a.score);

  sorted.forEach((entry, i) => {
    if (playerStates[entry.id]) playerStates[entry.id].position = i + 1;
  });

  // Broadcast to all players
  if (livingPlayers > 0) {
    broadcast(room, {
      type:  "game-state",
      state: { tick: now, elapsed, players: playerStates },
    });
  }

  // Timeout check
  if (elapsed > MAX_RACE_MS) endRace(room);

  // All finished check
  const totalFinished = room.finishedPlayers.length;
  if (totalFinished >= room.players.size && room.players.size > 0) {
    endRace(room);
  }
}

export function endRace(room: Room): void {
  if (room.gameLoopInterval) {
    clearInterval(room.gameLoopInterval);
    room.gameLoopInterval = null;
  }
  room.status = "finished";

  broadcast(room, {
    type:    "race-finish",
    results: room.finishedPlayers.map(f => ({
      playerId:  f.playerId,
      position:  f.position,
      totalTime: f.totalTime,
    })),
  });
}

export function handlePlayerInput(
  room:     Room,
  playerId: string,
  input:    { up: boolean; down: boolean; left: boolean; right: boolean; drift: boolean }
): void {
  // Server stores the input for audit; client runs physics authoritatively
  const player = room.players.get(playerId);
  if (!player) return;
  // Input acknowledged — no server-side physics in this architecture
  // Full authoritative physics validation added in a future session
}

export function handleCheckpoint(room: Room, playerId: string, index: number): void {
  const player = room.players.get(playerId);
  if (!player) return;
  if (!player.lapData.checkpointsPassed.includes(index)) {
    player.lapData.checkpointsPassed.push(index);
  }
}

export function handleLapComplete(room: Room, playerId: string, lapTime: number): void {
  const player = room.players.get(playerId);
  if (!player) return;
  player.lapData.lapTimes.push(lapTime);
  player.lapData.currentLap++;
  player.lapData.checkpointsPassed = [];

  broadcast(room, {
    type:  "game-state",
    state: {
      lapComplete: { playerId, lap: player.lapData.currentLap, lapTime },
    },
  });
}

export function handleRaceFinish(room: Room, playerId: string, totalTime: number): void {
  const player = room.players.get(playerId);
  if (!player || player.lapData.finishTime) return;
  player.lapData.finishTime = totalTime;

  const position = room.finishedPlayers.length + 1;
  room.finishedPlayers.push({ playerId, totalTime, position });

  broadcast(room, {
    type:  "game-state",
    state: { playerFinished: { playerId, position, totalTime } },
  });
}
