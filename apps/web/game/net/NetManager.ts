import type { WsMessage, Player } from "@capyjam/types";
import type { CapyKart } from "@capyjam/game-engine";
import { getWsClient, type WsClient } from "@/lib/ws-client";

const STATE_SEND_HZ  = 20; // send our state to server at 20Hz
const STATE_SEND_MS  = 1000 / STATE_SEND_HZ;

export type NetState = "offline" | "connecting" | "lobby" | "racing" | "finished";

export interface RemotePlayerInfo {
  id:       string;
  username: string;
  skin:     string;
  isReady:  boolean;
}

type RoomUpdateHandler   = (players: RemotePlayerInfo[], status: string) => void;
type RaceStartHandler    = (countdownMs: number) => void;
type StateUpdateHandler  = (playerId: string, state: {
  x: number; y: number; angle: number; speed: number; isDrifting: boolean;
}) => void;
type PlayerJoinHandler   = (player: RemotePlayerInfo) => void;
type PlayerLeaveHandler  = (playerId: string) => void;
type RaceFinishHandler   = (results: Array<{ playerId: string; position: number; totalTime: number }>) => void;
type ChatHandler         = (playerId: string, message: string) => void;

export class NetManager {
  private ws:        WsClient;
  private localPlayer: Player;
  private roomId:    string | null = null;
  private state:     NetState = "offline";
  private sendTimer  = 0;

  // Handlers
  private onRoomUpdate:   RoomUpdateHandler   | null = null;
  private onRaceStart:    RaceStartHandler    | null = null;
  private onStateUpdate:  StateUpdateHandler  | null = null;
  private onPlayerJoin:   PlayerJoinHandler   | null = null;
  private onPlayerLeave:  PlayerLeaveHandler  | null = null;
  private onRaceFinish:   RaceFinishHandler   | null = null;
  private onChatMessage:  ChatHandler         | null = null;

  private cleanup: (() => void) | null = null;

  constructor(localPlayer: Player) {
    this.localPlayer = localPlayer;
    this.ws = getWsClient();
  }

  async connect(roomId?: string): Promise<void> {
    this.state = "connecting";

    this.ws.onStateChange((s) => {
      if (s === "closed" || s === "error") this.state = "offline";
    });

    this.cleanup = this.ws.onMessage((msg) => this.handleMessage(msg));

    try {
      await this.ws.connect();
    } catch {
      this.state = "offline";
      throw new Error("Could not connect to game server");
    }

    // Join or create room
    this.ws.send({
      type:    "join-room",
      roomId:  roomId ?? "",
      player:  this.localPlayer,
    });

    this.state = "lobby";
    this.roomId = roomId ?? null;
  }

  sendReady(): void {
    this.ws.send({ type: "player-ready", playerId: this.localPlayer.id });
  }

  sendInput(input: { up: boolean; down: boolean; left: boolean; right: boolean; drift: boolean }): void {
    this.ws.send({ type: "player-input", playerId: this.localPlayer.id, input });
  }

  // Called every frame; only sends at 20Hz
  tickSendState(dt: number, kart: CapyKart): void {
    this.sendTimer += dt * 1000;
    if (this.sendTimer < STATE_SEND_MS) return;
    this.sendTimer -= STATE_SEND_MS;

    this.ws.send({
      type:  "game-state",
      state: {
        kart: {
          position:   kart.state.position,
          angle:      kart.state.angle,
          speed:      kart.state.speed,
          isDrifting: kart.state.isDrifting,
          spinTimer:  kart.state.spinTimer,
          boostTimer: kart.state.boostTimer,
        },
      },
    });
  }

  sendChat(message: string): void {
    this.ws.send({ type: "chat", playerId: this.localPlayer.id, message });
  }

  private handleMessage(msg: WsMessage): void {
    switch (msg.type) {
      case "game-state": {
        const s = msg.state as Record<string, unknown>;
        // Room state (join acknowledgement)
        if (s.roomId) {
          this.roomId = s.roomId as string;
          const players = (s.players as RemotePlayerInfo[]) ?? [];
          this.onRoomUpdate?.(players, s.status as string);
          return;
        }
        // Per-tick player positions
        if (s.players) {
          const players = s.players as Record<string, {
            x: number; y: number; angle: number; speed: number; isDrifting: boolean;
          }>;
          for (const [pid, state] of Object.entries(players)) {
            if (pid === this.localPlayer.id) continue;
            this.onStateUpdate?.(pid, state);
          }
        }
        break;
      }
      case "race-start":
        this.state = "racing";
        this.onRaceStart?.(msg.countdownMs);
        break;

      case "race-finish":
        this.state = "finished";
        this.onRaceFinish?.(msg.results as never);
        break;

      case "player-joined":
        this.onPlayerJoin?.({
          id:       msg.player.id,
          username: msg.player.username,
          skin:     msg.player.skin,
          isReady:  false,
        });
        break;

      case "player-left":
        this.onPlayerLeave?.(msg.playerId);
        break;

      case "player-ready":
        // Update ready state in room listing
        break;

      case "chat":
        this.onChatMessage?.(msg.playerId, msg.message);
        break;

      case "error":
        console.warn("[NetManager] Server error:", msg.message);
        break;
    }
  }

  // ── Event registration ───────────────────────────────────────────────────
  on(event: "room-update",  handler: RoomUpdateHandler):   void;
  on(event: "race-start",   handler: RaceStartHandler):    void;
  on(event: "state-update", handler: StateUpdateHandler):  void;
  on(event: "player-join",  handler: PlayerJoinHandler):   void;
  on(event: "player-leave", handler: PlayerLeaveHandler):  void;
  on(event: "race-finish",  handler: RaceFinishHandler):   void;
  on(event: "chat",         handler: ChatHandler):         void;
  on(event: string, handler: unknown): void {
    switch (event) {
      case "room-update":   this.onRoomUpdate   = handler as RoomUpdateHandler;   break;
      case "race-start":    this.onRaceStart    = handler as RaceStartHandler;    break;
      case "state-update":  this.onStateUpdate  = handler as StateUpdateHandler;  break;
      case "player-join":   this.onPlayerJoin   = handler as PlayerJoinHandler;   break;
      case "player-leave":  this.onPlayerLeave  = handler as PlayerLeaveHandler;  break;
      case "race-finish":   this.onRaceFinish   = handler as RaceFinishHandler;   break;
      case "chat":          this.onChatMessage  = handler as ChatHandler;         break;
    }
  }

  get netState(): NetState { return this.state; }
  get currentRoomId(): string | null { return this.roomId; }

  destroy(): void {
    this.cleanup?.();
    this.ws.disconnect();
  }
}
