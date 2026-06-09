import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-server/ws";
import { v4 as uuid } from "uuid";
import {
  createRoom, getAllRooms, getRoom,
  getRoomForPlayer, joinRoom, leaveRoom,
  getOrCreatePublicRoom, broadcast, send,
  getRoomSnapshot,
} from "./rooms";
import {
  startGameLoop, handlePlayerInput,
  handleCheckpoint, handleLapComplete, handleRaceFinish,
} from "./gameLoop";
import type { ServerPlayer } from "./types";
import type { WsMessage } from "@capyjam/types";

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.use("*", cors({ origin: "*" }));

// ── REST ──────────────────────────────────────────────────────────────────────
app.get("/health", (c) =>
  c.json({ ok: true, rooms: getAllRooms().length, uptime: process.uptime() })
);

app.get("/rooms", (c) => {
  const list = getAllRooms().map(getRoomSnapshot);
  return c.json(list);
});

app.post("/rooms", async (c) => {
  const body = await c.req.json<{ trackId: string; maxPlayers?: number; totalLaps?: number }>();
  const room = createRoom(body.trackId, body.maxPlayers ?? 8, body.totalLaps ?? 3);
  return c.json(getRoomSnapshot(room));
});

app.get("/rooms/:id", (c) => {
  const room = getRoom(c.req.param("id"));
  if (!room) return c.json({ error: "Not found" }, 404);
  return c.json(getRoomSnapshot(room));
});

// ── WebSocket ─────────────────────────────────────────────────────────────────
app.get("/ws", upgradeWebSocket(() => {
  const playerId = uuid();
  let serverPlayer: ServerPlayer | null = null;

  return {
    onOpen(_evt, _ws) {
      console.log(`[WS] connect ${playerId}`);
    },

    onMessage(evt, ws) {
      let msg: WsMessage;
      try {
        msg = JSON.parse(evt.data as string) as WsMessage;
      } catch { return; }

      switch (msg.type) {

        // ── Join room ────────────────────────────────────────────────────
        case "join-room": {
          const room = msg.roomId
            ? (getRoom(msg.roomId) ?? getOrCreatePublicRoom("00000000-0000-0000-0000-000000000001"))
            : getOrCreatePublicRoom("00000000-0000-0000-0000-000000000001");

          serverPlayer = {
            ...msg.player,
            id:       playerId,
            ws:       ws.raw,
            roomId:   room.id,
            isReady:  false,
            kartState: null,
            lastSeen: Date.now(),
            lapData:  { currentLap: 0, checkpointsPassed: [], lapTimes: [], finishTime: null },
          };

          const joined = joinRoom(room, serverPlayer);
          if (!joined) {
            // Room full — try next
            const fallback = getOrCreatePublicRoom("00000000-0000-0000-0000-000000000001");
            if (!joinRoom(fallback, serverPlayer)) {
              send(serverPlayer, { type: "error", message: "Could not join any room" });
              return;
            }
          }

          // Notify others
          broadcast(room, { type: "player-joined", player: serverPlayer }, playerId);

          // Send room state to joiner
          const roomPlayers = Array.from(room.players.values()).map(p => ({
            id:      p.id,
            username: p.username,
            skin:    p.skin,
            isReady: p.isReady,
          }));
          send(serverPlayer, {
            type:  "game-state",
            state: {
              roomId:   room.id,
              players:  roomPlayers,
              status:   room.status,
              trackId:  room.trackId,
              maxPlayers: room.maxPlayers,
              totalLaps:  room.totalLaps,
            },
          });
          break;
        }

        // ── Ready up ─────────────────────────────────────────────────────
        case "player-ready": {
          if (!serverPlayer) return;
          const room = getRoomForPlayer(playerId);
          if (!room) return;

          serverPlayer.isReady = true;
          broadcast(room, { type: "player-ready", playerId });

          // Auto-start when all players ready (min 1 player)
          const allReady  = Array.from(room.players.values()).every(p => p.isReady);
          const hasPlayers = room.players.size >= 1;
          if (allReady && hasPlayers && room.status === "waiting") {
            startGameLoop(room);
          }
          break;
        }

        // ── Player input ─────────────────────────────────────────────────
        case "player-input": {
          if (!serverPlayer) return;
          const room = getRoomForPlayer(playerId);
          if (!room) return;
          handlePlayerInput(room, playerId, msg.input);
          break;
        }

        // ── Kart state uplink ────────────────────────────────────────────
        case "game-state": {
          if (!serverPlayer) return;
          serverPlayer.lastSeen = Date.now();
          const s = msg.state as Record<string, unknown>;

          if (s.kart) {
            serverPlayer.kartState = s.kart as never;
          }

          // Checkpoint event
          if (typeof s.checkpoint === "number") {
            const room = getRoomForPlayer(playerId);
            if (room) handleCheckpoint(room, playerId, s.checkpoint as number);
          }

          // Lap complete event
          if (s.lapComplete) {
            const room = getRoomForPlayer(playerId);
            const { lapTime } = s.lapComplete as { lapTime: number };
            if (room) handleLapComplete(room, playerId, lapTime);
          }

          // Race finish event
          if (s.raceFinish) {
            const room = getRoomForPlayer(playerId);
            const { totalTime } = s.raceFinish as { totalTime: number };
            if (room) handleRaceFinish(room, playerId, totalTime);
          }
          break;
        }

        // ── Chat ──────────────────────────────────────────────────────────
        case "chat": {
          if (!serverPlayer) return;
          const room = getRoomForPlayer(playerId);
          if (!room) return;
          // Sanitise message
          const safe = String(msg.message).slice(0, 120).replace(/[<>]/g, "");
          broadcast(room, { type: "chat", playerId, message: safe });
          break;
        }

        default:
          break;
      }
    },

    onClose() {
      console.log(`[WS] disconnect ${playerId}`);
      if (!serverPlayer) return;
      const room = getRoomForPlayer(playerId);
      if (room) {
        broadcast(room, { type: "player-left", playerId });
        leaveRoom(room, playerId);
      }
    },
  };
}));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "3001");
const server = serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`🐾 CapyJam game server on :${PORT}`);
});

injectWebSocket(server);
export default app;
