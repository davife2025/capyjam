import { broadcast } from "./rooms";
import type { Room } from "./types";
import type { WsMessage } from "@capyjam/types";

const TICK_RATE = 20; // Hz
const TICK_MS = 1000 / TICK_RATE;
const COUNTDOWN_MS = 3000;

export function startGameLoop(room: Room): void {
  if (room.gameLoopInterval) return;

  room.status = "countdown";
  room.countdownEnd = Date.now() + COUNTDOWN_MS;

  broadcast(room, {
    type: "race-start",
    countdownMs: COUNTDOWN_MS,
  });

  // Start actual race after countdown
  setTimeout(() => {
    room.status = "racing";
    room.startTime = Date.now();

    room.gameLoopInterval = setInterval(() => {
      tickRoom(room);
    }, TICK_MS);
  }, COUNTDOWN_MS);
}

function tickRoom(room: Room): void {
  if (room.status !== "racing") return;

  const now = Date.now();
  const gameState: Record<string, {
    x: number; y: number; angle: number; speed: number;
    lap: number; position: number; isDrifting: boolean;
  }> = {};

  let allFinished = true;

  for (const [id, player] of room.players) {
    if (!player.kartState) {
      allFinished = false;
      continue;
    }

    gameState[id] = {
      x: player.kartState.position.x,
      y: player.kartState.position.y,
      angle: player.kartState.angle,
      speed: player.kartState.speed,
      lap: 0, // updated by client
      position: 0,
      isDrifting: player.kartState.isDrifting,
    };

    allFinished = false; // simplified — session 3 will add proper finish detection
  }

  const stateMsg: WsMessage = {
    type: "game-state",
    state: {
      tick: now,
      players: gameState,
    },
  };

  broadcast(room, stateMsg);

  // Auto-end after 10 minutes
  if (room.startTime && now - room.startTime > 10 * 60 * 1000) {
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
    type: "race-finish",
    results: [],
  });
}

export function handlePlayerInput(
  room: Room,
  playerId: string,
  input: { up: boolean; down: boolean; left: boolean; right: boolean; drift: boolean }
): void {
  const player = room.players.get(playerId);
  if (!player) return;

  // Server stores input; physics runs on client + server validates
  if (!player.kartState) return;

  // Lightweight server-side state update (full validation in session 3)
  player.kartState = {
    ...player.kartState,
    // Input acknowledged — client runs authoritative physics
  };
}
