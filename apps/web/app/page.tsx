import Link from "next/link";
import { Lobby } from "@/components/Lobby";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center py-16 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/40 to-gray-950 pointer-events-none" />
        <div className="relative z-10">
          <div className="text-7xl mb-4 select-none">🐾</div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4">
            <span className="text-yellow-400">CAPY</span>
            <span className="text-white">JAM</span>
          </h1>
          <p className="text-xl text-gray-400 mb-2">Capybara Racing</p>
          <p className="text-sm text-gray-500 mb-10">
            Free to play · No login required · Real-time multiplayer
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/race/quick" className="btn-capy text-lg">
              ⚡ Quick Race
            </Link>
            <Link href="/build" className="btn-secondary text-lg">
              🛠️ Build a Track
            </Link>
          </div>
        </div>
      </section>

      {/* Lobby */}
      <section className="flex-1 max-w-5xl mx-auto w-full px-4 pb-16">
        <h2 className="text-2xl font-bold mb-6 text-gray-200">Open Races</h2>
        <Lobby />
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-gray-600 text-sm">
        <p>
          Built for{" "}
          <a href="https://capyjam.dev" className="text-purple-400 hover:underline">
            CapyJam
          </a>{" "}
          · Vibe coded with love 🐾
        </p>
        <Link href="/leaderboard" className="text-gray-500 hover:text-gray-300 mt-1 inline-block">
          🏆 Leaderboard
        </Link>
      </footer>
    </main>
  );
}
