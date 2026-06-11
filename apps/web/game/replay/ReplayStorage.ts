"use client";

import {
  compressReplay,
  decompressReplay,
  type ReplayData,
  type CompressedReplay,
} from "./ReplayRecorder";
import { getSupabaseClient } from "@capyjam/supabase-client";

// ── Local storage ────────────────────────────────────────────────────────────

const LOCAL_KEY_PREFIX  = "capyjam_replay_";
const LOCAL_INDEX_KEY   = "capyjam_replay_index";
const MAX_LOCAL_REPLAYS = 10;

interface ReplayIndexEntry {
  id:         string;
  trackName:  string;
  playerName: string;
  totalTime:  number;
  finishPos:  number;
  recordedAt: number;
  lapTimes:   number[];
  remote:     boolean; // saved to Supabase
}

function getIndex(): ReplayIndexEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveIndex(index: ReplayIndexEntry[]): void {
  try {
    localStorage.setItem(LOCAL_INDEX_KEY, JSON.stringify(index));
  } catch { /* storage full */ }
}

export function saveReplayLocally(replay: ReplayData): void {
  const compressed = compressReplay(replay);
  const json       = JSON.stringify(compressed);

  try {
    // Enforce max local replays — evict oldest
    let index = getIndex();
    if (index.length >= MAX_LOCAL_REPLAYS) {
      const oldest = [...index].sort((a, b) => a.recordedAt - b.recordedAt)[0];
      localStorage.removeItem(LOCAL_KEY_PREFIX + oldest.id);
      index = index.filter(e => e.id !== oldest.id);
    }

    localStorage.setItem(LOCAL_KEY_PREFIX + replay.id, json);

    index.unshift({
      id:         replay.id,
      trackName:  replay.trackName,
      playerName: replay.playerName,
      totalTime:  replay.totalTime,
      finishPos:  replay.finishPos,
      recordedAt: replay.recordedAt,
      lapTimes:   replay.lapTimes,
      remote:     false,
    });

    saveIndex(index);
  } catch (e) {
    console.warn("[ReplayStorage] Failed to save locally:", e);
  }
}

export function loadReplayLocally(id: string): ReplayData | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY_PREFIX + id);
    if (!raw) return null;
    const compressed: CompressedReplay = JSON.parse(raw);
    return decompressReplay(compressed);
  } catch { return null; }
}

export function listLocalReplays(): ReplayIndexEntry[] {
  return getIndex().sort((a, b) => b.recordedAt - a.recordedAt);
}

export function deleteLocalReplay(id: string): void {
  localStorage.removeItem(LOCAL_KEY_PREFIX + id);
  saveIndex(getIndex().filter(e => e.id !== id));
}

export function getBestLocalReplay(trackId: string): ReplayData | null {
  const index = getIndex();
  const candidates = index.filter(e => {
    const raw = localStorage.getItem(LOCAL_KEY_PREFIX + e.id);
    if (!raw) return false;
    try {
      const c: CompressedReplay = JSON.parse(raw);
      return c.trackId === trackId;
    } catch { return false; }
  });

  if (candidates.length === 0) return null;

  const best = candidates.reduce((a, b) => a.totalTime < b.totalTime ? a : b);
  return loadReplayLocally(best.id);
}

// ── Supabase storage ─────────────────────────────────────────────────────────

export async function uploadReplay(
  replay:   ReplayData,
  playerId: string
): Promise<{ shareId: string } | { error: string }> {
  try {
    const db         = getSupabaseClient();
    const compressed = compressReplay(replay);
    const json       = JSON.stringify(compressed);
    const path       = `replays/${playerId}/${replay.id}.json`;

    // Upload to Supabase Storage
    const { error: uploadErr } = await db.storage
      .from("replays")
      .upload(path, json, { contentType: "application/json", upsert: true });

    if (uploadErr) throw uploadErr;

    // Get public URL
    const { data: urlData } = db.storage.from("replays").getPublicUrl(path);

    // Insert metadata row
    const { data: row, error: dbErr } = await db
      .from("replays")
      .insert({
        id:          replay.id,
        player_id:   playerId,
        track_id:    replay.trackId,
        total_time:  replay.totalTime,
        finish_pos:  replay.finishPos,
        lap_times:   replay.lapTimes,
        storage_url: urlData.publicUrl,
      })
      .select("id")
      .single();

    if (dbErr) throw dbErr;

    // Mark as remote in local index
    const index = getIndex();
    const entry = index.find(e => e.id === replay.id);
    if (entry) { entry.remote = true; saveIndex(index); }

    return { shareId: row.id };
  } catch (e) {
    return { error: String(e) };
  }
}

export async function downloadReplay(shareId: string): Promise<ReplayData | null> {
  try {
    const db = getSupabaseClient();
    const { data: row } = await db
      .from("replays")
      .select("storage_url")
      .eq("id", shareId)
      .single();

    if (!row?.storage_url) return null;

    const res  = await fetch(row.storage_url);
    if (!res.ok) return null;
    const compressed: CompressedReplay = await res.json();
    return decompressReplay(compressed);
  } catch { return null; }
}

export async function getTrackBestReplay(
  trackId:  string,
  limit = 5
): Promise<Array<{
  id:         string;
  playerName: string;
  totalTime:  number;
  lapTimes:   number[];
  finishPos:  number;
}>> {
  try {
    const db = getSupabaseClient();
    const { data } = await db
      .from("replays")
      .select("id, total_time, lap_times, finish_pos, profiles(username)")
      .eq("track_id", trackId)
      .eq("finish_pos", 1)
      .order("total_time", { ascending: true })
      .limit(limit);

    return (data ?? []).map((r: Record<string, unknown>) => ({
      id:         r.id as string,
      playerName: (r.profiles as { username: string } | null)?.username ?? "Unknown",
      totalTime:  r.total_time as number,
      lapTimes:   r.lap_times as number[],
      finishPos:  r.finish_pos as number,
    }));
  } catch { return []; }
}
