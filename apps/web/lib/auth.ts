"use client";

import { getSupabaseClient } from "@capyjam/supabase-client";
import type { User, Session } from "@supabase/supabase-js";

// ── Guest identity ────────────────────────────────────────────────────────────
// Always available — no login needed to play.
// Stored in localStorage so it persists across sessions.

const GUEST_KEY = "capyjam_guest";

export interface GuestIdentity {
  id:       string;
  username: string;
  isGuest:  true;
}

export function getOrCreateGuest(): GuestIdentity {
  if (typeof window === "undefined") {
    return { id: "ssr-guest", username: "Capy_Guest", isGuest: true };
  }

  const stored = localStorage.getItem(GUEST_KEY);
  if (stored) {
    try { return JSON.parse(stored) as GuestIdentity; } catch { /* corrupted */ }
  }

  const id       = crypto.randomUUID();
  const username = `Capy_${id.slice(0, 5).toUpperCase()}`;
  const guest: GuestIdentity = { id, username, isGuest: true };
  localStorage.setItem(GUEST_KEY, JSON.stringify(guest));
  return guest;
}

export function updateGuestUsername(username: string): void {
  const guest = getOrCreateGuest();
  const updated = { ...guest, username };
  localStorage.setItem(GUEST_KEY, JSON.stringify(updated));
}

// ── Supabase auth ─────────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<void> {
  const db = getSupabaseClient();
  await db.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/profile`,
    },
  });
}

export async function signInWithMagicLink(email: string): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/profile`,
    },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const db = getSupabaseClient();
  await db.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const db = getSupabaseClient();
  const { data } = await db.auth.getSession();
  return data.session;
}

export async function getUser(): Promise<User | null> {
  const db = getSupabaseClient();
  const { data } = await db.auth.getUser();
  return data.user ?? null;
}

// ── Unified identity (guest OR signed-in) ────────────────────────────────────

export interface AppIdentity {
  id:         string;
  username:   string;
  isGuest:    boolean;
  skin:       string;
  xp:         number;
  elo:        number;
  user?:      User;
}

export async function getIdentity(): Promise<AppIdentity> {
  try {
    const user = await getUser();
    if (user) {
      const db = getSupabaseClient();
      const { data: profile } = await db
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        return {
          id:       user.id,
          username: profile.username,
          isGuest:  false,
          skin:     profile.skin,
          xp:       profile.xp,
          elo:      profile.elo,
          user,
        };
      }
    }
  } catch { /* Supabase not configured or no session */ }

  // Fall back to guest
  const guest = getOrCreateGuest();
  return {
    id:       guest.id,
    username: guest.username,
    isGuest:  true,
    skin:     "capy-default",
    xp:       0,
    elo:      1000,
  };
}
