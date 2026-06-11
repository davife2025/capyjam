"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { loadReplayLocally, downloadReplay } from "@/game/replay/ReplayStorage";
import type { ReplayData } from "@/game/replay/ReplayRecorder";

function fmt(ms: number): string {
  const m   = Math.floor(ms / 60000);
  const s   = Math.floor((ms % 60000) / 1000);
  const mil = Math.floor(ms % 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(mil).padStart(3, "0")}`;
}

export default function ReplayPage() {
  const params    = useParams<{ id: string }>();
  const router    = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef   = useRef<{ destroy: (b: boolean) => void } | null>(null);

  const [replay,   setReplay]  = useState<ReplayData | null>(null);
  const [loading,  setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Load replay data
  useEffect(() => {
    async function load() {
      // Try local first, then remote
      let data = loadReplayLocally(params.id);
      if (!data) data = await downloadReplay(params.id);
      if (!data) { setNotFound(true); setLoading(false); return; }
      setReplay(data);
      setLoading(false);
    }
    load();
  }, [params.id]);

  // Boot Phaser replay viewer once data is loaded
  useEffect(() => {
    if (!replay || !containerRef.current || gameRef.current) return;

    async function initViewer() {
      const Phaser    = (await import("phaser")).default;
      const { PreloadScene } = await import("@/game/scenes/PreloadScene");
      const { ReplayViewerScene } = await import("@/game/scenes/ReplayViewerScene");

      const game = new Phaser.Game({
        type:   Phaser.AUTO,
        width:  containerRef.current!.clientWidth || 1280,
        height: containerRef.current!.clientHeight || 640,
        parent: containerRef.current!,
        backgroundColor: "#1a1a2e",
        scene:  [PreloadScene, ReplayViewerScene],
        scale: {
          mode:       Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      });

      game.registry.set("replayData", replay);
      gameRef.current = game;
    }

    initViewer();

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [replay]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl animate-bounce mb-4">🎬</div>
          <p className="text-gray-400 animate-pulse">Loading replay…</p>
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-gray-400 mb-6">Replay not found or expired.</p>
          <Link href="/" className="btn-capy">← Back to Lobby</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-950 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-white">
            🎬 Replay — {replay?.trackName}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {replay?.playerName} · {fmt(replay?.totalTime ?? 0)} · #{replay?.finishPos} finish
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/race/quick?ghost=${params.id}`}
            className="btn-capy text-sm py-2 px-4"
          >
            👻 Ghost Race
          </Link>
          <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
            ← Lobby
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      {replay && (
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-6 text-sm text-gray-400 overflow-x-auto">
          <span>Total: <strong className="text-white">{fmt(replay.totalTime)}</strong></span>
          {replay.lapTimes.map((lt, i) => (
            <span key={i}>Lap {i + 1}: <strong className="text-purple-400">{fmt(lt)}</strong></span>
          ))}
          {replay.lapTimes.length > 0 && (
            <span>Best: <strong className="text-yellow-400">{fmt(Math.min(...replay.lapTimes))}</strong></span>
          )}
        </div>
      )}

      {/* Phaser canvas */}
      <div
        ref={containerRef}
        id="replay-canvas-container"
        className="flex-1 w-full"
        style={{ minHeight: "600px" }}
      />
    </main>
  );
}
