"use client";

import { useEffect, useState } from "react";
import { SKINS } from "@capyjam/types";

interface XPBarProps {
  xp:       number;
  username: string;
  elo:      number;
  isGuest:  boolean;
}

function getLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function xpForLevel(level: number): number {
  return (level - 1) ** 2 * 100;
}

function xpForNextLevel(level: number): number {
  return level ** 2 * 100;
}

function nextUnlock(xp: number): typeof SKINS[number] | null {
  return [...SKINS].find(s => s.xpRequired > xp) ?? null;
}

export function XPBar({ xp, username, elo, isGuest }: XPBarProps) {
  const [displayXP, setDisplayXP] = useState(0);

  const level      = getLevel(xp);
  const levelStart = xpForLevel(level);
  const levelEnd   = xpForNextLevel(level);
  const progress   = Math.min(1, (xp - levelStart) / (levelEnd - levelStart));
  const unlock     = nextUnlock(xp);

  // Animate XP counter on mount
  useEffect(() => {
    let frame: number;
    const start    = performance.now();
    const duration = 1200;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplayXP(Math.floor(eased * xp));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [xp]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      {/* Identity row */}
      <div className="flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-full bg-purple-900/50 border-2 border-purple-500/40 flex items-center justify-center text-2xl select-none">
          🐾
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg text-white truncate">{username}</h2>
            {isGuest && (
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">Guest</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-sm text-purple-400 font-semibold">Lv.{level}</span>
            <span className="text-sm text-gray-500">{displayXP.toLocaleString()} XP</span>
            <span className="text-sm text-yellow-400">⚔ {elo} Elo</span>
          </div>
        </div>
      </div>

      {/* XP bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Level {level}</span>
          <span>Level {level + 1}</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="text-xs text-gray-600 mt-1 text-right">
          {(xp - levelStart).toLocaleString()} / {(levelEnd - levelStart).toLocaleString()} XP
        </div>
      </div>

      {/* Next unlock hint */}
      {unlock && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <span>🔒</span>
          <span>
            Next unlock:{" "}
            <span className="text-purple-400 font-medium">{unlock.name}</span>
            {" "}at {unlock.xpRequired.toLocaleString()} XP
            {" "}({Math.max(0, unlock.xpRequired - xp).toLocaleString()} to go)
          </span>
        </div>
      )}

      {isGuest && (
        <p className="mt-4 text-xs text-gray-600 border-t border-gray-800 pt-3">
          Sign in to save your XP and appear on the leaderboard.
        </p>
      )}
    </div>
  );
}
