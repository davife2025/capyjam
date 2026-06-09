"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TilePalette, TILE_PALETTE, type TileType } from "@/components/TilePalette";
import { validateTrack, saveDraftLocally, publishTrack, loadDraftLocally } from "@/lib/track-storage";
import { getIdentity } from "@/lib/auth";
import type { TrackTile } from "@capyjam/types";

const TILE_PX   = 32;   // display size in editor (half of game's 64px)
const GRID_W    = 32;
const GRID_H    = 24;
const MIN_ZOOM  = 0.5;
const MAX_ZOOM  = 3.0;

type TileMap = Map<string, TileType>;

function key(x: number, y: number) { return `${x},${y}`; }

function buildTileArray(tileMap: TileMap): TrackTile[] {
  const tiles: TrackTile[] = [];
  for (const [k, type] of tileMap) {
    const [x, y] = k.split(",").map(Number);
    tiles.push({ x, y, type, rotation: 0 });
  }
  // Fill grass for empty cells
  for (let x = 0; x < GRID_W; x++) {
    for (let y = 0; y < GRID_H; y++) {
      if (!tileMap.has(key(x, y))) {
        tiles.push({ x, y, type: "grass", rotation: 0 });
      }
    }
  }
  return tiles;
}

const TILE_COLORS: Record<TileType, string> = {
  road:       "#3E3E3E",
  grass:      "#2E7D32",
  dirt:       "#8B5A2B",
  boost:      "#F9CB42",
  mud:        "#4A2E1A",
  finish:     "#FFFFFF",
  start:      "#F9CB42",
  "item-box": "#FFD700",
  checkpoint: "#7FDDFF",
};

const TILE_EMOJI: Partial<Record<TileType, string>> = {
  boost:      "⚡",
  finish:     "🏁",
  start:      "🚦",
  "item-box": "📦",
  checkpoint: "📍",
};

export function TrackEditor() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [tileMap,  setTileMap]  = useState<TileMap>(() => {
    // Load draft or start with empty map
    const draft = loadDraftLocally();
    if (draft?.tiles) {
      const m = new Map<string, TileType>();
      for (const t of draft.tiles as TrackTile[]) {
        if (t.type !== "grass") m.set(key(t.x, t.y), t.type);
      }
      return m;
    }
    return new Map();
  });

  const [selected, setSelected] = useState<TileType | "eraser">("road");
  const [zoom,     setZoom]     = useState(1.2);
  const [pan,      setPan]      = useState({ x: 0, y: 0 });
  const [painting, setPainting] = useState(false);
  const [middleDrag, setMiddleDrag] = useState<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const [trackName, setTrackName]   = useState("My Capy Circuit");
  const [validation, setValidation] = useState<{ errors: string[]; warnings: string[] } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [published,  setPublished]  = useState<string | null>(null);
  const [authorId,   setAuthorId]   = useState<string | null>(null);

  // Get author on mount
  useEffect(() => {
    getIdentity().then(id => { if (!id.isGuest) setAuthorId(id.id); });
  }, []);

  // Hotkeys
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      const found = TILE_PALETTE.find(t => t.hotkey === e.key);
      if (found) setSelected(found.type);
      if (e.key === "0") setSelected("eraser");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Auto-save draft
  useEffect(() => {
    const tiles = buildTileArray(tileMap);
    saveDraftLocally({ name: trackName, tiles, width: GRID_W, height: GRID_H });
  }, [tileMap, trackName]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const cellPx = TILE_PX;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, GRID_W * cellPx, GRID_H * cellPx);

    // Tiles
    for (let x = 0; x < GRID_W; x++) {
      for (let y = 0; y < GRID_H; y++) {
        const type  = tileMap.get(key(x, y)) ?? "grass";
        const px    = x * cellPx;
        const py    = y * cellPx;

        ctx.fillStyle = TILE_COLORS[type] ?? "#2E7D32";
        ctx.fillRect(px, py, cellPx, cellPx);

        // Stripe for finish
        if (type === "finish") {
          const sq = cellPx / 4;
          for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
              ctx.fillStyle = (r + c) % 2 === 0 ? "#000" : "#FFF";
              ctx.fillRect(px + c * sq, py + r * sq, sq, sq);
            }
          }
        }

        // Boost arrow
        if (type === "boost") {
          ctx.fillStyle = "#EF9F27";
          ctx.beginPath();
          ctx.moveTo(px + cellPx * 0.2, py + cellPx * 0.8);
          ctx.lineTo(px + cellPx * 0.5, py + cellPx * 0.1);
          ctx.lineTo(px + cellPx * 0.8, py + cellPx * 0.8);
          ctx.closePath();
          ctx.fill();
        }

        // Emoji for special tiles
        const em = TILE_EMOJI[type];
        if (em && zoom > 0.8) {
          ctx.font        = `${cellPx * 0.55}px sans-serif`;
          ctx.textAlign   = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(em, px + cellPx / 2, py + cellPx / 2);
        }

        // Grid lines
        ctx.strokeStyle = "rgba(255,255,255,0.04)";
        ctx.lineWidth   = 0.5;
        ctx.strokeRect(px, py, cellPx, cellPx);
      }
    }

    // Border
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth   = 1 / zoom;
    ctx.strokeRect(0, 0, GRID_W * cellPx, GRID_H * cellPx);

    ctx.restore();
  }, [tileMap, zoom, pan]);

  // ── Mouse helpers ─────────────────────────────────────────────────────────
  function canvasToTile(clientX: number, clientY: number): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cx   = (clientX - rect.left - pan.x) / zoom;
    const cy   = (clientY - rect.top  - pan.y) / zoom;
    const tx   = Math.floor(cx / TILE_PX);
    const ty   = Math.floor(cy / TILE_PX);
    if (tx < 0 || ty < 0 || tx >= GRID_W || ty >= GRID_H) return null;
    return { x: tx, y: ty };
  }

  function paintAt(clientX: number, clientY: number, erase = false) {
    const tile = canvasToTile(clientX, clientY);
    if (!tile) return;
    setTileMap(prev => {
      const next = new Map(prev);
      const k    = key(tile.x, tile.y);
      if (erase || selected === "eraser") {
        next.delete(k);
      } else {
        next.set(k, selected as TileType);
      }
      return next;
    });
  }

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      setMiddleDrag({ sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y });
      return;
    }
    setPainting(true);
    paintAt(e.clientX, e.clientY, e.button === 2);
  }, [selected, pan, zoom]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (middleDrag) {
      setPan({
        x: middleDrag.px + (e.clientX - middleDrag.sx),
        y: middleDrag.py + (e.clientY - middleDrag.sy),
      });
      return;
    }
    if (painting) paintAt(e.clientX, e.clientY, e.buttons === 2);
  }, [painting, middleDrag, selected, pan, zoom]);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) { setMiddleDrag(null); return; }
    setPainting(false);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z - e.deltaY * 0.001)));
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  function clearAll() {
    if (!confirm("Clear the entire track?")) return;
    setTileMap(new Map());
  }

  function fillGrass() {
    // Fill all empty cells with grass (already done at build-time, this is visual reset)
    setTileMap(new Map());
  }

  function runValidation() {
    const tiles  = buildTileArray(tileMap);
    const result = validateTrack(tiles, GRID_W, GRID_H);
    setValidation(result);
    return result;
  }

  async function handlePublish() {
    const result = runValidation();
    if (!result.valid) return;

    setPublishing(true);
    const tiles = buildTileArray(tileMap);
    const res   = await publishTrack(trackName, tiles, GRID_W, GRID_H, authorId);
    setPublishing(false);

    if ("error" in res) {
      setValidation({ errors: [res.error], warnings: [] });
    } else {
      setPublished(res.id);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* Palette sidebar */}
      <TilePalette selected={selected} onSelect={setSelected} />

      {/* Canvas area */}
      <div className="flex-1 flex flex-col min-w-0 gap-3">

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={trackName}
            onChange={e => setTrackName(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white w-48 focus:outline-none focus:border-purple-500"
            placeholder="Track name..."
            maxLength={48}
          />
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-2 py-1">
            <button onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 0.2))} className="text-gray-400 hover:text-white px-2 py-1 text-sm">−</button>
            <span className="text-xs text-gray-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 0.2))} className="text-gray-400 hover:text-white px-2 py-1 text-sm">+</button>
          </div>
          <button onClick={() => setZoom(1.2)} className="text-xs text-gray-500 hover:text-white px-2 py-1">Reset zoom</button>
          <button onClick={clearAll} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 ml-auto">🗑 Clear</button>
          <button onClick={runValidation} className="btn-secondary text-sm py-2 px-4">✓ Validate</button>
          <button
            onClick={handlePublish}
            disabled={publishing || !!published}
            className="btn-capy text-sm py-2 px-4 disabled:opacity-50"
          >
            {publishing ? "Publishing…" : published ? "✓ Published!" : "🚀 Publish"}
          </button>
        </div>

        {/* Published link */}
        {published && (
          <div className="bg-green-900/30 border border-green-500/30 rounded-lg px-4 py-3 flex items-center gap-3">
            <span className="text-green-400 font-semibold text-sm">🎉 Track published!</span>
            <a href={`/race/${published}`} className="text-sm text-purple-400 hover:underline">
              Race it now →
            </a>
          </div>
        )}

        {/* Validation results */}
        {validation && (
          <div className={`rounded-lg px-4 py-3 text-sm border ${
            validation.errors.length > 0
              ? "bg-red-900/20 border-red-500/30 text-red-300"
              : "bg-green-900/20 border-green-500/30 text-green-300"
          }`}>
            {validation.errors.length > 0 ? (
              validation.errors.map((e, i) => <p key={i}>✗ {e}</p>)
            ) : (
              <p>✓ Track looks good!</p>
            )}
            {validation.warnings.map((w, i) => (
              <p key={i} className="text-yellow-400 mt-1">⚠ {w}</p>
            ))}
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 rounded-xl border border-gray-800 overflow-hidden bg-gray-950 relative cursor-crosshair"
          onContextMenu={e => e.preventDefault()}
        >
          <canvas
            ref={canvasRef}
            width={900}
            height={600}
            className="w-full h-full"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onWheel={onWheel}
            style={{ cursor: selected === "eraser" ? "cell" : "crosshair" }}
          />

          {/* Zoom hint */}
          <div className="absolute bottom-3 right-3 text-xs text-gray-600 bg-gray-900/80 px-2 py-1 rounded">
            {GRID_W}×{GRID_H} grid · {tileMap.size} tiles placed
          </div>
        </div>
      </div>
    </div>
  );
}
