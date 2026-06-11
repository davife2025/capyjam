"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listLocalReplays, deleteLocalReplay } from "@/game/replay/ReplayStorage";

interface Entry {
  id:         string;
  trackName:  string;
  playerName: string;
  totalTime:  number;
  finishPos:  number;
  recordedAt: number;
  lapTimes:   number[];
  remote:     boolean;
}

function fmt(ms: number): string {
  const m   = Math.floor(ms / 60000);
  const s   = Math.floor((ms % 60000) / 1000);
  const mil = Math.floor(ms % 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(mil).padStart(3, "0")}`;
}

function timeAgo(ts: number): string {
  const diff  = Date.now() - ts;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins  > 0) return `${mins}m ago`;
  return "just now";
}

const MEDALS = ["🥇","🥈","🥉"];

export function ReplayList() {
  const [replays, setReplays] = useState<Entry[]>([]);

  useEffect(() => {
    setReplays(listLocalReplays());
    // Refresh when a new replay is saved
    const handler = () => setReplays(listLocalReplays());
    window.addEventListener("capyjam:race-finish", handler);
    return () => window.removeEventListener("capyjam:race-finish", handler);
  }, []);

  function remove(id: string) {
    deleteLocalReplay(id);
    setReplays(listLocalReplays());
  }

  if (replays.length === 0) {
    return (
      <div className="text-center py-10 text-gray-600">
        <p className="text-3xl mb-3">🎬</p>
        <p>No replays yet — finish a race to record one.</p>
        <Link href="/race/quick" className="btn-capy inline-block mt-4 text-sm">
          Race Now
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {replays.map(r => (
        <div
          key={r.id}
          className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 hover:border-gray-700 transition-colors"
        >
          {/* Medal */}
          <span className="text-xl flex-shrink-0">
            {r.finishPos <= 3 ? MEDALS[r.finishPos - 1] : `${r.finishPos}th`}
          </span>

          {/* Track + time */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm truncate">{r.trackName}</p>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
              <span>⏱ {fmt(r.totalTime)}</span>
              {r.lapTimes.length > 0 && (
                <span>Best lap: {fmt(Math.min(...r.lapTimes))}</span>
              )}
              <span>{timeAgo(r.recordedAt)}</span>
              {r.remote && <span className="text-green-400">☁ Saved</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/replay/${r.id}`}
              className="text-xs px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white transition-colors"
            >
              ▶ Watch
            </Link>
            <Link
              href={`/race/quick?ghost=${r.id}`}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              👻 Ghost Race
            </Link>
            <button
              onClick={() => remove(r.id)}
              className="text-xs text-gray-600 hover:text-red-400 px-2 py-1.5 transition-colors"
              title="Delete replay"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
