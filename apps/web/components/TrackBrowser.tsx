"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCommunityTracks } from "@/lib/track-storage";

interface TrackEntry {
  id:         string;
  name:       string;
  author_id:  string | null;
  plays:      number;
  rating:     number;
  created_at: string;
  width:      number;
  height:     number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins  > 0) return `${mins}m ago`;
  return "just now";
}

export function TrackBrowser() {
  const [tracks,  setTracks]  = useState<TrackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort,    setSort]    = useState<"plays" | "recent">("plays");

  useEffect(() => {
    getCommunityTracks(30).then(data => {
      setTracks(data as TrackEntry[]);
      setLoading(false);
    });
  }, []);

  const sorted = [...tracks].sort((a, b) =>
    sort === "plays"
      ? b.plays - a.plays
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-sm text-gray-500">Sort by:</span>
        {(["plays", "recent"] as const).map(s => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
              sort === s
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {s === "plays" ? "🔥 Most Played" : "🆕 Newest"}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-4">🗺️</p>
          <p className="mb-2">No community tracks yet.</p>
          <Link href="/build" className="btn-capy inline-block mt-4 text-sm">
            Build the first track!
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(track => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      )}
    </div>
  );
}

function TrackCard({ track }: { track: TrackEntry }) {
  const size = `${track.width}×${track.height}`;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-purple-500/40 transition-all group">
      {/* Mini track thumbnail placeholder */}
      <div className="w-full h-20 rounded-lg bg-gray-800 mb-4 flex items-center justify-center text-3xl group-hover:bg-gray-750 transition-colors">
        🗺️
      </div>

      <h3 className="font-semibold text-white truncate mb-1">{track.name}</h3>

      <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
        <span>📐 {size}</span>
        <span>🎮 {track.plays.toLocaleString()} plays</span>
        <span>🕐 {timeAgo(track.created_at)}</span>
      </div>

      {track.rating > 0 && (
        <div className="flex items-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <span key={i} className={`text-sm ${i < Math.round(track.rating) ? "text-yellow-400" : "text-gray-700"}`}>★</span>
          ))}
          <span className="text-xs text-gray-500 ml-1">{track.rating.toFixed(1)}</span>
        </div>
      )}

      <Link
        href={`/race/${track.id}`}
        className="block w-full text-center py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors"
      >
        Race This Track →
      </Link>
    </div>
  );
}
