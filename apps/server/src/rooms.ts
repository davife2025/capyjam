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
    finishedPlayers: [],
  };
  rooms.set(room.id, room);
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}

export function getAllRooms(): Room[] {
  return Array.from(rooms.values()).filter(
    r => r.status === "waiting" && r.players.size < r.maxPlayers
  );
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

  // If race was started and only 0 players remain, clean up
  if (room.players.size === 0) {
    if (room.gameLoopInterval) clearInterval(room.gameLoopInterval);
    rooms.delete(room.id);
    return;
  }

  // If waiting and now empty-ish, keep room alive
}

export function broadcast(room: Room, msg: WsMessage, excludeId?: string): void {
  const json = JSON.stringify(msg);
  for (const [id, player] of room.players) {
    if (id === excludeId) continue;
    try {
      if ((player.ws as unknown as { readyState: number }).readyState === 1) {
        (player.ws as unknown as { send(d: string): void }).send(json);
      }
    } catch { /* player disconnected mid-send */ }
  }
}

export function send(player: ServerPlayer, msg: WsMessage): void {
  try {
    const ws = player.ws as unknown as { readyState: number; send(d: string): void };
    if (ws.readyState === 1) ws.send(JSON.stringify(msg));
  } catch { /* disconnected */ }
}

export function getOrCreatePublicRoom(trackId: string): Room {
  for (const room of rooms.values()) {
    if (
      room.trackId === trackId &&
      room.status === "waiting" &&
      room.players.size < room.maxPlayers
    ) return room;
  }
  return createRoom(trackId);
}

export function markPlayerFinished(room: Room, playerId: string, totalTime: number): void {
  room.finishedPlayers.push({ playerId, totalTime, position: room.finishedPlayers.length + 1 });
}

export function getRoomSnapshot(room: Room): object {
  return {
    id:          room.id,
    trackId:     room.trackId,
    playerCount: room.players.size,
    maxPlayers:  room.maxPlayers,
    status:      room.status,
    totalLaps:   room.totalLaps,
  };
}

export { rooms };
