import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CapyJam — Capybara Racing",
  description: "The most chaotic capybara kart racing game. Free to play, no login required.",
  // CapyJam hackathon ownership claim
  other: {
    "capyjam-owner": "capyjam-racer",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* CapyJam ownership meta tag — required by hackathon rules */}
      <head>
        <meta name="capyjam-owner" content="capyjam-racer" />
      </head>
      <body className="bg-gray-950 text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
