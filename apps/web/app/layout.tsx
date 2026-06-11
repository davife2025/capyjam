import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "CapyJam — Capybara Racing",
  description:
    "The most chaotic capybara kart racing game. Free to play, no login required. Real-time multiplayer, track builder, unlockable skins.",
  keywords: ["capybara", "racing", "game", "kart", "multiplayer", "browser"],
  openGraph: {
    title: "CapyJam — Capybara Racing",
    description: "Race capybaras. No login. No download. Pure chaos.",
    type: "website",
  },
  // CapyJam hackathon ownership claim
  other: { "capyjam-owner": "capyjam-racer" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          CapyJam hackathon ownership meta tag — required by submission rules.
          Update the `content` value to your actual CapyJam username before submitting.
          See SUBMISSION.md for the full pre-submit checklist.
        */}
        <meta name="capyjam-owner" content="capyjam-racer" />
      </head>
      <body className="bg-gray-950 text-white min-h-screen antialiased">

        {/* ── Global nav ────────────────────────────────────────────────────── */}
        <nav className="sticky top-0 z-50 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between gap-2">

            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 font-black text-lg hover:opacity-80 transition-opacity select-none"
            >
              <span aria-hidden>🐾</span>
              <span className="text-yellow-400">CAPY</span>
              <span className="text-white">JAM</span>
            </Link>

            {/* Nav links */}
            <div className="flex items-center gap-0.5 text-sm">
              <NavLink href="/race/quick">⚡ Race</NavLink>
              <NavLink href="/leaderboard">🏆 Leaderboard</NavLink>
              <NavLink href="/build">🛠️ Build</NavLink>
              <Link
                href="/profile"
                className="ml-1 px-3 py-1.5 rounded-lg bg-purple-900/40 text-purple-300
                           hover:bg-purple-800/50 hover:text-white transition-all
                           border border-purple-700/30 font-medium"
              >
                🐾 Profile
              </Link>
            </div>
          </div>
        </nav>

        {children}

        {/* ── Global footer ─────────────────────────────────────────────────── */}
        <footer className="border-t border-gray-800/50 mt-16 py-8 text-center text-gray-600 text-xs">
          <p>
            Built for{" "}
            <a href="https://capyjam.dev" className="text-purple-400 hover:underline">
              CapyJam
            </a>
            {" "}· Free to play · No login required · Open source
          </p>
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/60 transition-all"
    >
      {children}
    </Link>
  );
}
