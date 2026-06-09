"use client";

import { useState } from "react";
import { TrackEditor } from "@/components/TrackEditor";
import { TrackBrowser } from "@/components/TrackBrowser";
import Link from "next/link";

type Tab = "build" | "browse";

export default function BuildPage() {
  const [tab, setTab] = useState<Tab>("build");

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">
              🛠️ <span className="text-white">Track Builder</span>
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Paint tiles, validate, publish — then race your creation
            </p>
          </div>
          <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
            ← Lobby
          </Link>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 pb-0">
          {(["build", "browse"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`
                px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2
                ${tab === t
                  ? "border-purple-500 text-white bg-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900/50"
                }
              `}
            >
              {t === "build" ? "🖌️ Editor" : "🌍 Community Tracks"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex flex-col min-h-0">
        {tab === "build" ? (
          <div className="flex-1 flex flex-col" style={{ minHeight: "600px" }}>
            <TrackEditor />
          </div>
        ) : (
          <TrackBrowser />
        )}
      </div>
    </main>
  );
}
