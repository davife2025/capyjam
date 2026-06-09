import type { WsMessage, Player, RaceStatus } from "@capyjam/types";
import type { KartState } from "@capyjam/game-engine";
import type WebSocket from "ws";

export interface ServerPlayer extends Player {
  ws: WebSocket;
  roomId: string | null;
  isReady: boolean;
  kartState: KartState | null;
  lastPing: number;
}

export interface Room {
  id: string;
  trackId: string;
  players: Map<string, ServerPlayer>;
  status: RaceStatus;
  maxPlayers: number;
  totalLaps: number;
  createdAt: number;
  gameLoopInterval: ReturnType<typeof setInterval> | null;
  startTime: number | null;
  countdownEnd: number | null;
}

export type SendFn = (player: ServerPlayer, msg: WsMessage) => void;
export type BroadcastFn = (room: Room, msg: WsMessage, excludeId?: string) => void;
