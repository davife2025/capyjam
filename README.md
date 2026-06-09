# 🐾 CapyJam — Capybara Racing

> The most chaotic capybara kart racing game. Built for [CapyJam](https://capyjam.dev).

## Quick Start

```bash
# Prerequisites: Node 20+, pnpm 9+

# Install dependencies
pnpm install

# Copy env file
cp .env.example .env.local
# Fill in your Supabase URL + keys

# Start Supabase locally (optional - needs Docker)
npx supabase start
npx supabase db push

# Start everything
pnpm dev
```

- **Web app**: http://localhost:3000
- **Game server**: http://localhost:3001
- **Supabase studio**: http://localhost:54323

## Session Build Plan

| Session | Feature | Deliverable |
|---------|---------|-------------|
| ✅ 1 | Monorepo scaffold + architecture | `capyjam-session-1.zip` |
| 2 | Phaser 3 game — track, kart physics, race loop | diff zip |
| 3 | Real-time multiplayer — WebSocket race rooms | diff zip |
| 4 | Profiles, skins, XP + leaderboard | diff zip |
| 5 | Track builder — drag-drop editor | diff zip |
| 6 | Polish, deploy + submission | diff zip |

## Stack

- **Frontend**: Next.js 14 (App Router) + Phaser 3 + Tailwind CSS
- **Game server**: Hono.js + WebSocket (Fly.io)
- **Database**: Supabase (PostgreSQL + Realtime + Auth + Storage)
- **Monorepo**: Turborepo + pnpm workspaces
- **Shared packages**: `@capyjam/types`, `@capyjam/game-engine`, `@capyjam/supabase-client`

## Architecture

```
capyjam/
├── apps/
│   ├── web/          # Next.js 14 + Phaser 3
│   └── server/       # Hono.js WebSocket game server
├── packages/
│   ├── types/        # Zod schemas, shared types
│   ├── game-engine/  # Physics, kart logic (shared server+client)
│   └── supabase-client/  # Typed Supabase wrapper
└── supabase/         # Migrations, edge functions
```

## Hackathon Requirements

- ✅ Features a capybara
- ✅ Racing game format
- ✅ Web-based, plays in browser, no download
- ✅ No iframe wrapper
- ✅ No paywall, no login required to play
- ✅ Free to play
- ✅ Ownership meta tag: `<meta name="capyjam-owner" content="capyjam-racer" />`

## Controls

| Key | Action |
|-----|--------|
| Arrow keys / WASD | Steer + accelerate |
| Shift | Drift |
| Space | Use power-up |

## Deploy

```bash
# Frontend → Vercel
vercel deploy

# Game server → Fly.io
fly launch
fly deploy
```
