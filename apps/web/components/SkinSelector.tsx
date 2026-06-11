"use client";

import { useState } from "react";
import { SKINS, type SkinId } from "@capyjam/types";
import { getSupabaseClient } from "@capyjam/supabase-client";

interface SkinSelectorProps {
  currentSkin: SkinId;
  playerXP:    number;
  playerId:    string;
  isGuest:     boolean;
  onChange?:   (skin: SkinId) => void;
}

const SKIN_COLORS: Record<string, string> = {
  "capy-default":   "from-amber-700  to-amber-500",
  "capy-racer":     "from-red-700    to-red-500",
  "capy-pirate":    "from-purple-700 to-purple-500",
  "capy-astronaut": "from-blue-700   to-blue-500",
  "capy-samurai":   "from-emerald-700 to-emerald-500",
};

const SKIN_EMOJI: Record<string, string> = {
  "capy-default":   "🐾",
  "capy-racer":     "🏎️",
  "capy-pirate":    "☠️",
  "capy-astronaut": "🚀",
  "capy-samurai":   "⚔️",
};

export function SkinSelector({ currentSkin, playerXP, playerId, isGuest, onChange }: SkinSelectorProps) {
  const [selected, setSelected]   = useState<SkinId>(currentSkin);
  const [saving,   setSaving]     = useState(false);
  const [saved,    setSaved]      = useState(false);

  const isUnlocked = (xpRequired: number) => playerXP >= xpRequired;

  async function selectSkin(skinId: SkinId, xpRequired: number) {
    if (!isUnlocked(xpRequired)) return;
    setSelected(skinId);
    onChange?.(skinId);

    if (!isGuest) {
      setSaving(true);
      try {
        const db = getSupabaseClient();
        await db.from("profiles").update({ skin: skinId }).eq("id", playerId);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch { /* ignore */ }
      finally { setSaving(false); }
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-white">Capy Skins</h3>
        {saving && <span className="text-xs text-gray-500 animate-pulse">Saving…</span>}
        {saved  && <span className="text-xs text-green-400">✓ Saved</span>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {SKINS.map(skin => {
          const unlocked  = isUnlocked(skin.xpRequired);
          const isActive  = selected === skin.id;

          return (
            <button
              key={skin.id}
              onClick={() => selectSkin(skin.id, skin.xpRequired)}
              disabled={!unlocked}
              className={`
                relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150
                ${isActive
                  ? "border-purple-400 bg-purple-900/30 scale-105 shadow-lg shadow-purple-900/30"
                  : unlocked
                    ? "border-gray-700 hover:border-gray-500 hover:bg-gray-800/50 cursor-pointer"
                    : "border-gray-800 opacity-40 cursor-not-allowed"
                }
              `}
            >
              {/* Skin swatch */}
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${SKIN_COLORS[skin.id] ?? "from-gray-700 to-gray-600"} flex items-center justify-center text-2xl shadow-inner`}>
                {SKIN_EMOJI[skin.id] ?? "🐾"}
              </div>

              <div className="text-center">
                <p className={`text-xs font-semibold leading-tight ${isActive ? "text-purple-300" : "text-gray-300"}`}>
                  {skin.name}
                </p>
                {skin.xpRequired > 0 && (
                  <p className={`text-xs mt-0.5 ${unlocked ? "text-green-400" : "text-gray-600"}`}>
                    {unlocked ? "✓ Unlocked" : `${skin.xpRequired.toLocaleString()} XP`}
                  </p>
                )}
                {skin.xpRequired === 0 && (
                  <p className="text-xs mt-0.5 text-gray-500">Free</p>
                )}
              </div>

              {/* Active checkmark */}
              {isActive && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-purple-400 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">✓</span>
                </div>
              )}

              {/* Lock icon */}
              {!unlocked && (
                <div className="absolute top-2 right-2 text-gray-600 text-sm">🔒</div>
              )}
            </button>
          );
        })}
      </div>

      {isGuest && (
        <p className="mt-4 text-xs text-gray-600 border-t border-gray-800 pt-3">
          Sign in to save your skin preference across sessions.
        </p>
      )}
    </div>
  );
}
