"use client";

import Link from "next/link";

export interface RoomInfo {
  id:          string;
  trackId:     string;
  playerCount: number;
  maxPlayers:  number;
  status:      string;
  totalLaps?:  number;
}

interface RoomCardProps {
  room:     RoomInfo;
  onJoin?:  (roomId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  waiting:   "bg-green-900/50 text-green-400",
  countdown: "bg-yellow-900/50 text-yellow-400",
  racing:    "bg-blue-900/50 text-blue-400",
  finished:  "bg-gray-800 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  waiting:   "Open",
  countdown: "Starting...",
  racing:    "In Race",
  finished:  "Finished",
};

export function RoomCard({ room, onJoin }: RoomCardProps) {
  const canJoin = room.status === "waiting" && room.playerCount < room.maxPlayers;
  const isFull  = room.playerCount >= room.maxPlayers;

  return (
    <div
      className={`
        bg-gray-900 border rounded-xl p-5 transition-all duration-200
        ${canJoin
          ? "border-gray-700 hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-900/20 cursor-pointer"
          : "border-gray-800 opacity-60"
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-semibold text-sm text-gray-200">
            Room{" "}
            <span className="text-purple-400 font-mono">{room.id.slice(0, 8)}</span>
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            🏁 Capy Jungle Circuit
            {room.totalLaps ? ` · ${room.totalLaps} laps` : ""}
          </p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[room.status] ?? STATUS_COLORS.waiting}`}>
          {STATUS_LABELS[room.status] ?? room.status}
        </span>
      </div>

      {/* Player slots bar */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: room.maxPlayers }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-2 rounded-full transition-colors duration-300 ${
              i < room.playerCount ? "bg-purple-500" : "bg-gray-700"
            }`}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Array.from({ length: room.playerCount }).map((_, i) => (
            <span key={i} className="text-lg">🐾</span>
          ))}
          <span className="text-sm text-gray-500 ml-1">
            {room.playerCount}/{room.maxPlayers}
          </span>
        </div>

        {canJoin ? (
          <Link
            href={`/race/${room.id}`}
            onClick={() => onJoin?.(room.id)}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors"
          >
            Join →
          </Link>
        ) : (
          <span className="text-sm text-gray-600 px-4 py-2">
            {isFull ? "Full" : room.status === "racing" ? "Watch" : "Closed"}
          </span>
        )}
      </div>
    </div>
  );
}
