import { getLeaderboard } from "@capyjam/supabase-client";
import Link from "next/link";

export const revalidate = 60; // ISR - refresh every minute

export default async function LeaderboardPage() {
  let leaders: Awaited<ReturnType<typeof getLeaderboard>> = [];
  try {
    leaders = await getLeaderboard(100);
  } catch {
    // Supabase not configured yet - show empty state
  }

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-4 py-12">
      <Link href="/" className="text-gray-400 hover:text-white text-sm mb-8 inline-block">
        ← Back to lobby
      </Link>

      <h1 className="text-4xl font-black mb-2">
        🏆 <span className="text-yellow-400">Leaderboard</span>
      </h1>
      <p className="text-gray-500 mb-8">Global Elo rankings</p>

      {leaders.length === 0 ? (
        <div className="text-center py-24 text-gray-600">
          <p className="text-5xl mb-4">🐾</p>
          <p>No races yet. Be the first to race!</p>
          <Link href="/race/quick" className="btn-capy mt-6 inline-block">
            Race Now
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {leaders.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-4 bg-gray-900 rounded-xl px-5 py-4 hover:bg-gray-800 transition-colors"
            >
              <span
                className={`position-badge ${
                  i === 0 ? "p1" : i === 1 ? "p2" : i === 2 ? "p3" : "other"
                }`}
              >
                {i + 1}
              </span>

              <div className="flex-1">
                <p className="font-semibold">{p.username}</p>
                <p className="text-gray-500 text-sm">{p.xp.toLocaleString()} XP</p>
              </div>

              <div className="text-right">
                <p className="font-bold text-purple-400">{p.elo}</p>
                <p className="text-gray-600 text-xs">Elo</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
