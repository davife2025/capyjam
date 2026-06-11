"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { XPBar } from "@/components/XPBar";
import { SkinSelector } from "@/components/SkinSelector";
import { ReplayList } from "@/components/ReplayList";
import { getIdentity, signInWithGoogle, signInWithMagicLink, signOut, type AppIdentity } from "@/lib/auth";
import type { SkinId } from "@capyjam/types";

type AuthMode = "idle" | "email" | "sent";

export default function ProfilePage() {
  const [identity,  setIdentity]  = useState<AppIdentity | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [authMode,  setAuthMode]  = useState<AuthMode>("idle");
  const [email,     setEmail]     = useState("");
  const [sending,   setSending]   = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    getIdentity().then(id => {
      setIdentity(id);
      setLoading(false);
    });
  }, []);

  async function handleMagicLink() {
    if (!email.trim()) return;
    setSending(true);
    setAuthError(null);
    try {
      await signInWithMagicLink(email.trim());
      setAuthMode("sent");
    } catch (e) {
      setAuthError("Could not send link. Check your email address.");
    } finally {
      setSending(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    const guest = await getIdentity();
    setIdentity(guest);
  }

  function handleSkinChange(skin: SkinId) {
    if (!identity) return;
    setIdentity({ ...identity, skin });
    // Also update localStorage for guest persistence
    if (identity.isGuest) {
      const stored = localStorage.getItem("capyjam_guest");
      if (stored) {
        try {
          const g = JSON.parse(stored);
          localStorage.setItem("capyjam_guest", JSON.stringify({ ...g, skin }));
        } catch {}
      }
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen max-w-2xl mx-auto px-4 py-12">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl h-32 animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  if (!identity) return null;

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-12">
      <Link href="/" className="text-gray-400 hover:text-white text-sm mb-8 inline-block">
        ← Back to lobby
      </Link>

      <h1 className="text-3xl font-black mb-8">
        🐾 <span className="text-white">My Profile</span>
      </h1>

      {/* XP + identity card */}
      <div className="mb-6">
        <XPBar
          xp={identity.xp}
          username={identity.username}
          elo={identity.elo}
          isGuest={identity.isGuest}
        />
      </div>

      {/* Skin selector */}
      <div className="mb-6">
        <SkinSelector
          currentSkin={identity.skin as SkinId}
          playerXP={identity.xp}
          playerId={identity.id}
          isGuest={identity.isGuest}
          onChange={handleSkinChange}
        />
      </div>

      {/* Race stats */}
      <div className="mb-6 bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="font-bold text-white mb-4">Race Stats</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Races",    value: "—",           icon: "🏁" },
            { label: "Wins",     value: "—",           icon: "🏆" },
            { label: "Best Lap", value: "—",           icon: "⏱️" },
          ].map(stat => (
            <div key={stat.label} className="text-center bg-gray-800/50 rounded-xl p-4">
              <p className="text-2xl mb-1">{stat.icon}</p>
              <p className="text-lg font-bold text-white">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
        {identity.isGuest && (
          <p className="text-xs text-gray-600 mt-4">Sign in to track your race history.</p>
        )}
      </div>

      {/* Replays */}
      <div className="mb-6 bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white">🎬 My Replays</h3>
          <span className="text-xs text-gray-600">Stored locally · last 10</span>
        </div>
        <ReplayList />
      </div>

      {/* Auth panel */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        {!identity.isGuest ? (
          /* Signed-in state */
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Signed in</p>
                <p className="text-sm text-gray-500 mt-0.5">{identity.user?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-gray-800"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : authMode === "sent" ? (
          /* Email sent */
          <div className="text-center py-4">
            <p className="text-2xl mb-3">📬</p>
            <p className="font-semibold text-white mb-1">Check your email</p>
            <p className="text-sm text-gray-500">
              We sent a magic link to <span className="text-purple-400">{email}</span>
            </p>
            <button
              onClick={() => setAuthMode("idle")}
              className="mt-4 text-sm text-gray-500 hover:text-white"
            >
              Try a different email
            </button>
          </div>
        ) : (
          /* Sign-in options */
          <div>
            <h3 className="font-bold text-white mb-1">Save your progress</h3>
            <p className="text-sm text-gray-500 mb-5">
              Sign in to keep your XP, skins, and appear on the leaderboard.
              You can always play as a guest without signing in.
            </p>

            {/* Google */}
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-4 rounded-xl transition-colors mb-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* Magic link */}
            {authMode === "idle" ? (
              <button
                onClick={() => setAuthMode("email")}
                className="w-full text-sm text-gray-400 hover:text-white py-2 transition-colors"
              >
                Or sign in with email →
              </button>
            ) : (
              <div className="mt-2">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleMagicLink()}
                    placeholder="you@example.com"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                    autoFocus
                  />
                  <button
                    onClick={handleMagicLink}
                    disabled={sending || !email.trim()}
                    className="btn-capy text-sm py-2 px-4 disabled:opacity-50"
                  >
                    {sending ? "…" : "Send"}
                  </button>
                </div>
                {authError && (
                  <p className="text-red-400 text-xs mt-2">{authError}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick nav */}
      <div className="mt-6 flex gap-3">
        <Link href="/race/quick" className="btn-capy flex-1 text-center">
          ⚡ Race Now
        </Link>
        <Link href="/leaderboard" className="btn-secondary flex-1 text-center">
          🏆 Leaderboard
        </Link>
      </div>
    </main>
  );
}
