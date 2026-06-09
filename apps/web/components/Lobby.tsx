"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RoomInfo {
  id: string;
  trackId: string;
  playerCount: number;
  maxPlayers: number;
  status: string;
}

export function Lobby() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const serverUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? "http://localhost:3001";

  async function fetchRooms() {
    try {
      const res = await fetch(`${serverUrl}/rooms`);
      if (!res.ok) throw new Error("Server offline");
      const data = await res.json();
      setRooms(data);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-900 rounded-xl h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {rooms.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-4">🏁</p>
          <p className="mb-2">No open races yet.</p>
          <Link href="/race/quick" className="btn-capy inline-block mt-4">
            Start the first race!
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}

function RoomCard({ room }: { room: RoomInfo }) {
  const isFull = room.playerCount >= room.maxPlayers;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-purple-500/50 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-semibold text-sm text-gray-300">
            Room <span className="text-purple-400">{room.id.slice(0, 8)}</span>
          </p>
          <p className="text-xs text-gray-600 mt-0.5">Capy Jungle Circuit</p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            isFull ? "bg-red-900/50 text-red-400" : "bg-green-900/50 text-green-400"
          }`}
        >
          {isFull ? "Full" : "Open"}
        </span>
      </div>

      {/* Player slots */}
      <div className="flex gap-1 mb-4">
        {[...Array(room.maxPlayers)].map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full ${
              i < room.playerCount ? "bg-purple-500" : "bg-gray-700"
            }`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {room.playerCount}/{room.maxPlayers} racers
        </span>
        <Link
          href={isFull ? "#" : `/race/${room.id}`}
          className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
            isFull
              ? "bg-gray-800 text-gray-600 cursor-not-allowed"
              : "bg-purple-600 hover:bg-purple-500 text-white"
          }`}
        >
          {isFull ? "Full" : "Join →"}
        </Link>
      </div>
    </div>
  );
}
