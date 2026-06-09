import { v4 as uuid } from "uuid";
import type { Room, ServerPlayer } from "./types";
import type { WsMessage } from "@capyjam/types";

const rooms = new Map<string, Room>();

export function createRoom(trackId: string, maxPlayers = 8, totalLaps = 3): Room {
  const room: Room = {
    id: uuid(),
    trackId,
    players: new Map(),
    status: "waiting",
    maxPlayers,
    totalLaps,
    createdAt: Date.now(),
    gameLoopInterval: null,
    startTime: null,
    countdownEnd: null,
  };
  rooms.set(room.id, room);
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}

export function getAllRooms(): Room[] {
  return Array.from(rooms.values()).filter(r => r.status === "waiting");
}

export function getRoomForPlayer(playerId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players.has(playerId)) return room;
  }
  return undefined;
}

export function joinRoom(room: Room, player: ServerPlayer): boolean {
  if (room.players.size >= room.maxPlayers) return false;
  if (room.status !== "waiting") return false;

  player.roomId = room.id;
  room.players.set(player.id, player);
  return true;
}

export function leaveRoom(room: Room, playerId: string): void {
  room.players.delete(playerId);

  // Clean up empty rooms
  if (room.players.size === 0) {
    if (room.gameLoopInterval) clearInterval(room.gameLoopInterval);
    rooms.delete(room.id);
  }
}

export function broadcast(room: Room, msg: WsMessage, excludeId?: string): void {
  const json = JSON.stringify(msg);
  for (const [id, player] of room.players) {
    if (id === excludeId) continue;
    if (player.ws.readyState === 1 /* OPEN */) {
      player.ws.send(json);
    }
  }
}

export function send(player: ServerPlayer, msg: WsMessage): void {
  if (player.ws.readyState === 1) {
    player.ws.send(JSON.stringify(msg));
  }
}

export function getOrCreatePublicRoom(trackId: string): Room {
  // Find an open room for this track
  for (const room of rooms.values()) {
    if (room.trackId === trackId && room.status === "waiting" && room.players.size < room.maxPlayers) {
      return room;
    }
  }
  return createRoom(trackId);
}

export { rooms };
