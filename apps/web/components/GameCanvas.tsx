"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface GameCanvasProps {
  roomId?: string;
  trackId: string;
}

export function GameCanvas({ roomId, trackId }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    let game: { destroy: (removeCanvas: boolean) => void } | null = null;

    async function initGame() {
      try {
        // Dynamically import Phaser to avoid SSR issues
        const Phaser = (await import("phaser")).default;
        const { PreloadScene } = await import("@/game/scenes/PreloadScene");
        const { RaceScene } = await import("@/game/scenes/RaceScene");

        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          width: containerRef.current!.clientWidth || 1280,
          height: containerRef.current!.clientHeight || 720,
          parent: containerRef.current!,
          backgroundColor: "#1a1a2e",
          physics: {
            default: "arcade",
            arcade: { debug: process.env.NODE_ENV === "development" },
          },
          scene: [PreloadScene, RaceScene],
          scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
          },
        };

        game = new Phaser.Game(config);
        gameRef.current = game;

        // Pass room/track config to game via registry
        game.registry?.set("roomId", roomId);
        game.registry?.set("trackId", trackId);

        setLoading(false);
      } catch (err) {
        console.error("Failed to init Phaser:", err);
        setError("Failed to load game. Please refresh.");
        setLoading(false);
      }
    }

    initGame();

    return () => {
      if (game) {
        game.destroy(true);
        gameRef.current = null;
      }
    };
  }, [roomId, trackId]);

  return (
    <div className="relative flex-1 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <Link href="/" className="text-gray-400 hover:text-white text-sm">
          ← Lobby
        </Link>
        <p className="text-sm font-semibold text-yellow-400">🐾 CapyJam Racing</p>
        <div className="text-xs text-gray-500">
          {roomId ? `Room: ${roomId.slice(0, 8)}` : "Quick Race"}
        </div>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        id="game-canvas-container"
        className="flex-1 w-full relative"
        style={{ minHeight: "600px" }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
            <div className="text-center">
              <div className="text-6xl animate-bounce mb-4">🐾</div>
              <p className="text-gray-400 animate-pulse">Loading race...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="btn-capy"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile controls hint */}
      <div className="md:hidden flex items-center justify-center gap-2 py-2 bg-gray-900 text-xs text-gray-500">
        <span>Touch controls active</span>
      </div>
    </div>
  );
}
