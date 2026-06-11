# 🐾 CapyJam: Capybara Racing — Project Summary

A complete, production-grade capybara kart racing game built across 8 sessions.
Monorepo: Next.js 14 + Phaser 3 + Hono WebSocket server + Supabase.

## Session Map

| # | Focus | Key deliverables |
|---|-------|-------------------|
| 1 | Monorepo scaffold | Turborepo, pnpm workspaces, shared packages, Supabase schema |
| 2 | Core game | Phaser 3 race scene, kart physics (drift/boost/spin), AI opponents, items |
| 3 | Multiplayer | WebSocket rooms, 20Hz sync, ghost car interpolation, lobby |
| 4 | Profiles | Guest-first auth, XP/Elo, unlockable skins, leaderboard |
| 5 | Track builder | Canvas tile editor, validation, community tracks |
| 6 | Polish | Procedural audio, particles, mobile touch controls, deploy configs |
| 7 | Replays | Recording, ghost racing, replay viewer with playback controls |
| 8 | Integration | Wired ghost-race links end-to-end, final QA pass |

## Repo Layout

```
capyjam/
├── apps/
│   ├── web/      Next.js 14 — lobby, race, build, profile, leaderboard, replay
│   └── server/   Hono.js WebSocket game server (Fly.io)
├── packages/
│   ├── types/            Zod schemas shared everywhere
│   ├── game-engine/       Physics, CapyKart, Track, PowerUp (server + client)
│   └── supabase-client/   Typed Supabase wrapper
├── supabase/
│   ├── migrations/  001-006: profiles, RLS, rooms, skins, tracks, replays
│   └── functions/   rank-update, validate-track
├── fly.toml          Game server deploy config
└── SUBMISSION.md     Hackathon checklist
```

## Run Locally

```bash
pnpm install
cp .env.example .env.local   # add Supabase keys
supabase db push             # apply all 6 migrations
pnpm dev                      # web :3000, server :3001
```

## Feature Checklist

- [x] Kart physics: drift charge → mini-turbo, boost, spin-out on hit
- [x] 4 AI opponents, 3 difficulty tiers, waypoint following
- [x] Real-time multiplayer rooms with server-authoritative race start
- [x] Items: speed boost, banana, shell, star, mud, nitro
- [x] Guest play (zero login) + optional Google/email auth
- [x] XP, Elo, 5 unlockable skins, global leaderboard with podium
- [x] In-browser track builder (32×24 grid, 9 tile types, publish flow)
- [x] Procedural audio (engine, drift, items, countdown, finish, music)
- [x] Particle effects: exhaust, boost trail, drift sparks, confetti
- [x] Mobile touch controls (joystick + drift/item buttons)
- [x] Replay recording + ghost racing against your best lap
- [x] Replay viewer with play/pause/speed controls
- [x] Ownership meta tag for hackathon compliance

## Before You Submit

1. Update `apps/web/app/layout.tsx` → `<meta name="capyjam-owner" content="YOUR_USERNAME" />`
2. Deploy: Supabase → Fly.io (server) → Vercel (web) — see `SUBMISSION.md`
3. Test on mobile, test multiplayer with 2 tabs, test ghost racing
4. Submit your Vercel URL 🏁

🐾 Good luck!
