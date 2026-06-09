"use client";

import type { TrackTile } from "@capyjam/types";

export type TileType = TrackTile["type"];

export interface TileInfo {
  type:        TileType;
  label:       string;
  emoji:       string;
  color:       string;
  description: string;
  hotkey:      string;
}

export const TILE_PALETTE: TileInfo[] = [
  { type: "road",       label: "Road",       emoji: "🛣️",  color: "#3E3E3E", description: "Standard racing surface",    hotkey: "1" },
  { type: "grass",      label: "Grass",      emoji: "🌿",  color: "#2E7D32", description: "Off-road, slows karts",     hotkey: "2" },
  { type: "dirt",       label: "Dirt",       emoji: "🟫",  color: "#8B5A2B", description: "Rough terrain shortcut",    hotkey: "3" },
  { type: "boost",      label: "Boost Pad",  emoji: "⚡",  color: "#F9CB42", description: "Rockets karts forward",     hotkey: "4" },
  { type: "mud",        label: "Mud Patch",  emoji: "💦",  color: "#4A2E1A", description: "Slows karts dramatically",  hotkey: "5" },
  { type: "finish",     label: "Finish",     emoji: "🏁",  color: "#FFFFFF", description: "Finish/start line",         hotkey: "6" },
  { type: "start",      label: "Start Grid", emoji: "🚦",  color: "#F9CB42", description: "Kart starting positions",   hotkey: "7" },
  { type: "item-box",   label: "Item Box",   emoji: "📦",  color: "#FFD700", description: "Power-up pickup",           hotkey: "8" },
  { type: "checkpoint", label: "Checkpoint", emoji: "📍",  color: "#7FDDFF", description: "Anti-shortcut gate",        hotkey: "9" },
];

const ERASER: TileInfo = {
  type: "grass", label: "Eraser", emoji: "🧹", color: "#2E7D32",
  description: "Remove tiles (replace with grass)", hotkey: "0",
};

interface TilePaletteProps {
  selected:   TileType | "eraser";
  onSelect:   (type: TileType | "eraser") => void;
}

export function TilePalette({ selected, onSelect }: TilePaletteProps) {
  return (
    <div className="flex flex-col gap-1 w-40 flex-shrink-0">
      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1 px-1">Tiles</p>

      {TILE_PALETTE.map(tile => (
        <TileButton
          key={tile.type}
          tile={tile}
          isSelected={selected === tile.type}
          onClick={() => onSelect(tile.type)}
        />
      ))}

      <div className="border-t border-gray-700 my-1" />

      <TileButton
        tile={ERASER}
        isSelected={selected === "eraser"}
        onClick={() => onSelect("eraser")}
        isEraser
      />

      <div className="mt-3 px-1">
        <p className="text-xs text-gray-600 leading-relaxed">
          <span className="text-gray-500">Left click</span> — paint<br />
          <span className="text-gray-500">Right click</span> — erase<br />
          <span className="text-gray-500">Scroll</span> — zoom<br />
          <span className="text-gray-500">Middle drag</span> — pan
        </p>
      </div>
    </div>
  );
}

function TileButton({
  tile, isSelected, onClick, isEraser = false,
}: {
  tile: TileInfo;
  isSelected: boolean;
  onClick: () => void;
  isEraser?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={`${tile.description} [${tile.hotkey}]`}
      className={`
        flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-all duration-100 w-full
        ${isSelected
          ? "bg-purple-600 text-white ring-1 ring-purple-400"
          : "text-gray-300 hover:bg-gray-800 hover:text-white"
        }
      `}
    >
      <span
        className="w-6 h-6 rounded flex items-center justify-center text-sm flex-shrink-0"
        style={{ background: isEraser ? "transparent" : tile.color + "44", border: `1px solid ${tile.color}66` }}
      >
        {tile.emoji}
      </span>
      <span className="text-xs font-medium truncate">{isEraser ? "Eraser" : tile.label}</span>
      <span className="text-xs text-gray-600 ml-auto flex-shrink-0">{tile.hotkey}</span>
    </button>
  );
}
