import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// ── Singleton client (browser) ───────────────────────────────────────────────

let _client: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase env vars. Check .env.local");
  }

  _client = createClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: { eventsPerSecond: 25 },
    },
  });

  return _client;
}

// ── Server-side client (service role) ────────────────────────────────────────

export function getSupabaseAdmin(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase service role env vars.");
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}

// ── Typed query helpers ───────────────────────────────────────────────────────

export async function getProfile(userId: string) {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function upsertProfile(userId: string, username: string) {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from("profiles")
    .upsert({ id: userId, username }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getLeaderboard(limit = 50) {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from("profiles")
    .select("id, username, elo, xp, skin")
    .order("elo", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function saveRaceResult(
  raceId: string,
  playerId: string,
  position: number,
  totalTime: number,
  lapTimes: number[]
) {
  const db = getSupabaseClient();
  const { error } = await db.from("race_results").insert({
    race_id: raceId,
    player_id: playerId,
    position,
    total_time: totalTime,
    lap_times: lapTimes,
  });
  if (error) throw error;
}

export async function getPublishedTracks(limit = 20) {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from("tracks")
    .select("id, name, author_id, plays, rating, created_at, profiles(username)")
    .eq("published", true)
    .order("plays", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export { createClient };
export type { Database };
