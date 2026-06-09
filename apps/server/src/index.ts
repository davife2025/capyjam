import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-server/ws";
import { v4 as uuid } from "uuid";
import {
  createRoom,
  getAllRooms,
  getRoom,
  getRoomForPlayer,
  joinRoom,
  leaveRoom,
  getOrCreatePublicRoom,
  broadcast,
  send,
} from "./rooms";
import { startGameLoop, handlePlayerInput } from "./gameLoop";
import type { ServerPlayer } from "./types";
import type { WsMessage } from "@capyjam/types";
import type { KartState } from "@capyjam/game-engine";

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.use("*", cors({ origin: "*" }));

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (c) => c.json({ ok: true, rooms: getAllRooms().length }));

// ── Room listing (REST) ───────────────────────────────────────────────────────
app.get("/rooms", (c) => {
  const rooms = getAllRooms().map(r => ({
    id: r.id,
    trackId: r.trackId,
    playerCount: r.players.size,
    maxPlayers: r.maxPlayers,
    status: r.status,
  }));
  return c.json(rooms);
});

app.post("/rooms", async (c) => {
  const body = await c.req.json<{ trackId: string; maxPlayers?: number; totalLaps?: number }>();
  const room = createRoom(body.trackId, body.maxPlayers, body.totalLaps);
  return c.json({ id: room.id });
});

// ── WebSocket ─────────────────────────────────────────────────────────────────
app.get(
  "/ws",
  upgradeWebSocket(() => {
    const playerId = uuid();
    let serverPlayer: ServerPlayer | null = null;

    return {
      onOpen(_, ws) {
        console.log(`[WS] Player connected: ${playerId}`);
      },

      onMessage(evt, ws) {
        let msg: WsMessage;
        try {
          msg = JSON.parse(evt.data as string) as WsMessage;
        } catch {
          return;
        }

        switch (msg.type) {
          case "join-room": {
            const room = msg.roomId
              ? getRoom(msg.roomId) ?? getOrCreatePublicRoom(msg.player.trackId ?? "default")
              : getOrCreatePublicRoom("00000000-0000-0000-0000-000000000001");

            serverPlayer = {
              ...msg.player,
              id: playerId,
              ws: ws.raw as never,
              roomId: room.id,
              isReady: false,
              kartState: null,
              lastPing: Date.now(),
            };

            const joined = joinRoom(room, serverPlayer);
            if (!joined) {
              send(serverPlayer, { type: "error", message: "Room is full" });
              return;
            }

            // Tell everyone else
            broadcast(room, { type: "player-joined", player: serverPlayer }, playerId);

            // Send current room state to new player
            send(serverPlayer, {
              type: "game-state",
              state: {
                roomId: room.id,
                players: Array.from(room.players.values()).map(p => ({
                  id: p.id,
                  username: p.username,
                  skin: p.skin,
                  isReady: p.isReady,
                })),
                status: room.status,
                trackId: room.trackId,
              },
            });
            break;
          }

          case "player-ready": {
            if (!serverPlayer) return;
            const room = getRoomForPlayer(playerId);
            if (!room) return;

            serverPlayer.isReady = true;
            broadcast(room, { type: "player-ready", playerId });

            // Auto-start when all players ready (min 1 for solo, or all for multiplayer)
            const allReady = Array.from(room.players.values()).every(p => p.isReady);
            const enough = room.players.size >= 1;
            if (allReady && enough && room.status === "waiting") {
              startGameLoop(room);
            }
            break;
          }

          case "player-input": {
            if (!serverPlayer) return;
            const room = getRoomForPlayer(playerId);
            if (!room) return;
            handlePlayerInput(room, playerId, msg.input);
            break;
          }

          case "game-state": {
            // Client sending its kart state up to server
            if (!serverPlayer) return;
            serverPlayer.kartState = (msg.state as { kart: KartState }).kart;
            serverPlayer.lastPing = Date.now();
            break;
          }

          default:
            break;
        }
      },

      onClose() {
        console.log(`[WS] Player disconnected: ${playerId}`);
        if (!serverPlayer) return;
        const room = getRoomForPlayer(playerId);
        if (room) {
          broadcast(room, { type: "player-left", playerId });
          leaveRoom(room, playerId);
        }
      },
    };
  })
);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "3001");
const server = serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`🐾 CapyJam game server running on port ${PORT}`);
});

injectWebSocket(server);

export default app;
