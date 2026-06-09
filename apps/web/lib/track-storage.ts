"use client";

import { getSupabaseClient } from "@capyjam/supabase-client";
import type { TrackData, TrackTile } from "@capyjam/types";
import { TILE_SIZE } from "@capyjam/game-engine";

// ── Local draft persistence ───────────────────────────────────────────────────

const DRAFT_KEY = "capyjam_track_draft";

export function saveDraftLocally(track: Partial<TrackData>): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(track));
  } catch { /* storage full */ }
}

export function loadDraftLocally(): Partial<TrackData> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}

// ── Track validation ──────────────────────────────────────────────────────────

export interface ValidationResult {
  valid:    boolean;
  errors:   string[];
  warnings: string[];
}

export function validateTrack(tiles: TrackTile[], width: number, height: number): ValidationResult {
  const errors:   string[] = [];
  const warnings: string[] = [];

  const roadTiles      = tiles.filter(t => t.type === "road" || t.type === "boost" || t.type === "dirt");
  const finishTiles    = tiles.filter(t => t.type === "finish");
  const startTiles     = tiles.filter(t => t.type === "start");
  const checkpointTiles = tiles.filter(t => t.type === "checkpoint");

  if (roadTiles.length < 8)   errors.push("Track needs at least 8 road tiles.");
  if (finishTiles.length === 0) errors.push("Track needs a finish line tile.");
  if (startTiles.length === 0)  errors.push("Track needs at least one start tile.");
  if (checkpointTiles.length === 0) warnings.push("No checkpoints placed — shortcuts will be possible.");
  if (roadTiles.length > 2000)  warnings.push("Very large track — may affect performance.");

  // Check finish + start are connected by road
  // (simplified: just check they're not isolated)
  const roadSet = new Set(roadTiles.map(t => `${t.x},${t.y}`));

  for (const f of finishTiles) {
    const neighbors = [
      `${f.x-1},${f.y}`, `${f.x+1},${f.y}`,
      `${f.x},${f.y-1}`, `${f.x},${f.y+1}`,
    ];
    if (!neighbors.some(n => roadSet.has(n))) {
      errors.push("Finish line is not connected to any road tiles.");
      break;
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ── Auto-generate checkpoints from road path ──────────────────────────────────

export function autoGenerateCheckpoints(
  tiles: TrackTile[],
  width: number,
  height: number
): Array<{ x: number; y: number }> {
  // Find road tiles, sample every ~15 tiles for checkpoints
  const roadTiles = tiles
    .filter(t => ["road","boost","dirt"].includes(t.type))
    .sort((a, b) => a.y - b.y || a.x - b.x);

  if (roadTiles.length < 4) return [];

  const step = Math.max(3, Math.floor(roadTiles.length / 6));
  const checkpoints: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < roadTiles.length; i += step) {
    const t = roadTiles[i];
    checkpoints.push({
      x: t.x * TILE_SIZE + TILE_SIZE / 2,
      y: t.y * TILE_SIZE + TILE_SIZE / 2,
    });
  }

  return checkpoints;
}

// ── Auto-generate start positions from start tiles ────────────────────────────

export function autoGenerateStartPositions(
  tiles: TrackTile[]
): Array<{ x: number; y: number; angle: number }> {
  const startTiles = tiles.filter(t => t.type === "start");
  if (startTiles.length === 0) {
    // Fall back to finish tile
    const finish = tiles.find(t => t.type === "finish");
    if (finish) {
      return Array.from({ length: 8 }, (_, i) => ({
        x:     finish.x * TILE_SIZE + TILE_SIZE / 2 + (i % 2) * 72,
        y:     finish.y * TILE_SIZE + TILE_SIZE / 2 + Math.floor(i / 2) * 56,
        angle: finish.rotation * (Math.PI / 180),
      }));
    }
    return [];
  }

  return startTiles.flatMap((t, i) => [
    { x: t.x * TILE_SIZE + 20, y: t.y * TILE_SIZE + TILE_SIZE / 2, angle: t.rotation * Math.PI / 180 },
    { x: t.x * TILE_SIZE + TILE_SIZE - 20, y: t.y * TILE_SIZE + TILE_SIZE / 2, angle: t.rotation * Math.PI / 180 },
  ]);
}

// ── Publish to Supabase ───────────────────────────────────────────────────────

export async function publishTrack(
  name:     string,
  tiles:    TrackTile[],
  width:    number,
  height:   number,
  authorId: string | null
): Promise<{ id: string } | { error: string }> {
  const validation = validateTrack(tiles, width, height);
  if (!validation.valid) {
    return { error: validation.errors[0] };
  }

  const checkpoints    = autoGenerateCheckpoints(tiles, width, height);
  const startPositions = autoGenerateStartPositions(tiles);

  try {
    const db = getSupabaseClient();
    const { data, error } = await db
      .from("tracks")
      .insert({
        name,
        author_id:       authorId,
        tiles:           tiles as never,
        width,
        height,
        checkpoints:     checkpoints as never,
        start_positions: startPositions as never,
        published:       true,
      })
      .select("id")
      .single();

    if (error) throw error;
    clearDraft();
    return { id: data.id };
  } catch (e) {
    return { error: String(e) };
  }
}

// ── Fetch community tracks ────────────────────────────────────────────────────

export async function getCommunityTracks(limit = 20) {
  try {
    const db = getSupabaseClient();
    const { data, error } = await db
      .from("tracks")
      .select("id, name, author_id, plays, rating, created_at, width, height")
      .eq("published", true)
      .order("plays", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

// ── Increment play count ──────────────────────────────────────────────────────

export async function incrementTrackPlays(trackId: string): Promise<void> {
  try {
    const db = getSupabaseClient();
    await db.rpc("increment_track_plays" as never, { p_track_id: trackId } as never);
  } catch { /* fire and forget */ }
}
