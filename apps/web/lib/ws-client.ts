"use client";

import type { WsMessage, Player } from "@capyjam/types";

type MessageHandler = (msg: WsMessage) => void;
type StateHandler   = (state: "connecting" | "open" | "closed" | "error") => void;

const RECONNECT_DELAY = 2000;
const MAX_RECONNECTS  = 5;
const PING_INTERVAL   = 5000;

export class WsClient {
  private ws:           WebSocket | null = null;
  private url:          string;
  private handlers:     Set<MessageHandler> = new Set();
  private stateHandler: StateHandler | null = null;
  private reconnects    = 0;
  private intentional   = false;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private messageQueue: WsMessage[] = []; // buffer while connecting

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.intentional = false;
      this.stateHandler?.("connecting");

      try {
        this.ws = new WebSocket(this.url);
      } catch (e) {
        reject(e);
        return;
      }

      this.ws.onopen = () => {
        this.reconnects = 0;
        this.stateHandler?.("open");
        // Flush queued messages
        for (const msg of this.messageQueue) this._send(msg);
        this.messageQueue = [];
        this.startPing();
        resolve();
      };

      this.ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string) as WsMessage;
          for (const h of this.handlers) h(msg);
        } catch { /* malformed */ }
      };

      this.ws.onerror = () => {
        this.stateHandler?.("error");
        reject(new Error("WebSocket error"));
      };

      this.ws.onclose = () => {
        this.stopPing();
        this.stateHandler?.("closed");
        if (!this.intentional && this.reconnects < MAX_RECONNECTS) {
          this.reconnects++;
          setTimeout(() => this.connect(), RECONNECT_DELAY * this.reconnects);
        }
      };
    });
  }

  send(msg: WsMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this._send(msg);
    } else {
      this.messageQueue.push(msg);
    }
  }

  private _send(msg: WsMessage): void {
    this.ws!.send(JSON.stringify(msg));
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onStateChange(handler: StateHandler): void {
    this.stateHandler = handler;
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Lightweight keep-alive — piggyback on game-state type
        this.ws.send(JSON.stringify({ type: "game-state", state: { ping: Date.now() } }));
      }
    }, PING_INTERVAL);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  disconnect(): void {
    this.intentional = true;
    this.stopPing();
    this.ws?.close();
    this.ws = null;
  }

  get isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton per session
let _client: WsClient | null = null;

export function getWsClient(): WsClient {
  const url = process.env.NEXT_PUBLIC_GAME_SERVER_WS_URL ?? "ws://localhost:3001";
  if (!_client) _client = new WsClient(`${url}/ws`);
  return _client;
}

export function destroyWsClient(): void {
  _client?.disconnect();
  _client = null;
}
