"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { RoomCard, type RoomInfo } from "@/components/RoomCard";
import { getSupabaseClient } from "@capyjam/supabase-client";

const SERVER_URL = process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? "http://localhost:3001";
const POLL_MS    = 4000;

export function Lobby() {
  const [rooms,   setRooms]   = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [online,  setOnline]  = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/rooms`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error("Server offline");
      const data: RoomInfo[] = await res.json();
      setRooms(data);
      setOnline(true);
    } catch {
      setOnline(false);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll + Supabase realtime for instant updates
  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, POLL_MS);

    // Subscribe to Supabase room_registry changes for instant lobby updates
    let channel: ReturnType<typeof getSupabaseClient>["channel"] extends
      (...args: never[]) => infer R ? R : never;
    try {
      const db = getSupabaseClient();
      channel = db
        .channel("room-registry-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "room_registry" }, fetchRooms)
        .subscribe();
    } catch { /* Supabase not configured */ }

    return () => {
      clearInterval(interval);
      // @ts-ignore
      channel?.unsubscribe?.();
    };
  }, [fetchRooms]);

  async function createRoom() {
    setCreating(true);
    try {
      const res = await fetch(`${SERVER_URL}/rooms`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ trackId: "00000000-0000-0000-0000-000000000001" }),
      });
      if (!res.ok) throw new Error();
      const room = await res.json();
      window.location.href = `/race/${room.id}`;
    } catch {
      alert("Could not create room. Is the game server running?");
    } finally {
      setCreating(false);
    }
  }

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl h-36 animate-pulse" />
        ))}
      </div>
    );
  }

  // ── Server offline ──────────────────────────────────────────────────────────
  if (!online) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-4">🔌</p>
        <p className="text-gray-500 mb-2">Game server offline</p>
        <p className="text-gray-600 text-sm mb-6">
          Run <code className="bg-gray-800 px-2 py-0.5 rounded text-purple-300">pnpm dev</code> to start it locally
        </p>
        <button onClick={fetchRooms} className="btn-secondary text-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Action row */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-gray-500 text-sm">
          {rooms.length === 0
            ? "No open rooms yet"
            : `${rooms.length} open room${rooms.length !== 1 ? "s" : ""}`}
        </p>
        <div className="flex gap-3">
          <button
            onClick={fetchRooms}
            className="text-sm text-gray-500 hover:text-white transition-colors"
            title="Refresh"
          >
            ↻ Refresh
          </button>
          <button
            onClick={createRoom}
            disabled={creating}
            className="btn-capy text-sm py-2 px-4 disabled:opacity-50"
          >
            {creating ? "Creating..." : "+ Create Room"}
          </button>
        </div>
      </div>

      {/* Room grid */}
      {rooms.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-5xl mb-4">🏁</p>
          <p className="text-lg mb-2">No open races yet.</p>
          <p className="text-sm mb-6 text-gray-700">Be the first — create a room or jump in solo.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/race/quick" className="btn-capy">
              ⚡ Quick Solo Race
            </Link>
            <button onClick={createRoom} className="btn-secondary">
              + Create Room
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}

      {/* Online indicator */}
      <div className="mt-6 flex items-center gap-2 text-xs text-gray-600">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Server online · refreshes every {POLL_MS / 1000}s
      </div>
    </div>
  );
}
