import type { Player, RaceStatus } from "@capyjam/types";
import type { KartState } from "@capyjam/game-engine";

export interface ServerPlayer extends Player {
  ws:        unknown; // WebSocket — typed as unknown to avoid import issues
  roomId:    string | null;
  isReady:   boolean;
  kartState: KartState | null;
  lastSeen:  number;
  lapData: {
    currentLap:       number;
    checkpointsPassed: number[];
    lapTimes:          number[];
    finishTime:        number | null;
  };
}

export interface FinishedEntry {
  playerId:  string;
  totalTime: number;
  position:  number;
}

export interface Room {
  id:              string;
  trackId:         string;
  players:         Map<string, ServerPlayer>;
  status:          RaceStatus;
  maxPlayers:      number;
  totalLaps:       number;
  createdAt:       number;
  gameLoopInterval: ReturnType<typeof setInterval> | null;
  startTime:       number | null;
  countdownEnd:    number | null;
  finishedPlayers: FinishedEntry[];
}
