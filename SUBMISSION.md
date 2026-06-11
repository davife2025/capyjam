# 🐾 CapyJam Submission Checklist

Use this before submitting **CapyJam: Capybara Racing** to the hackathon.

## ✅ Hackathon Requirements

- [x] **Features a capybara** — every kart is a capybara racer with 5 unlockable skins
- [x] **Racing game (broadly interpreted)** — kart racing with laps, checkpoints, items, AI + multiplayer
- [x] **Mostly vibe coded** — built across 6 sessions with Claude
- [x] **Web-based, plays in browser, no download** — Next.js + Phaser 3, runs entirely client-side
- [x] **Public playable link** — deploy to Vercel (see below) and paste URL into submission form
- [x] **No iframe wrapper** — `X-Frame-Options: DENY` set in `vercel.json`
- [x] **No paywall, no login, no wallet connection required to play** — guest identity auto-created via `localStorage`, `/race/quick` works instantly
- [x] **Free to play** — no payment anywhere in the codebase
- [x] **Ownership meta tag** — `<meta name="capyjam-owner" content="capyjam-racer" />` in `app/layout.tsx`

> ⚠️ **Before submitting**: update the `capyjam-owner` meta tag value in
> `apps/web/app/layout.tsx` to your actual CapyJam username/handle.

---

## 🚀 Deploy Steps

### 1. Database — Supabase
```bash
# Create project at supabase.com, then:
supabase link --project-ref YOUR_PROJECT_REF
supabase db push                     # applies all 5 migrations
supabase functions deploy rank-update
supabase functions deploy validate-track
```

Copy your Supabase URL + anon key into `.env.local` and Vercel env vars.

### 2. Game Server — Fly.io
```bash
fly auth login
fly launch --no-deploy        # uses fly.toml in repo root
fly secrets set NODE_ENV=production
fly deploy
```
Note the resulting URL (e.g. `https://capyjam-server.fly.dev`).

### 3. Web App — Vercel
```bash
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_GAME_SERVER_URL        # https://capyjam-server.fly.dev
vercel env add NEXT_PUBLIC_GAME_SERVER_WS_URL     # wss://capyjam-server.fly.dev
vercel deploy --prod
```

### 4. Verify
- [ ] Visit your Vercel URL — lobby loads
- [ ] `/race/quick` — solo race with 4 AI works, sound plays after first click
- [ ] Create a room, open in 2 tabs — multiplayer ghost cars sync
- [ ] `/build` — paint a track, validate, publish, race it
- [ ] `/profile` — guest XP shows, sign in with Google/email works
- [ ] `/leaderboard` — populates after a signed-in race finishes
- [ ] View page source — confirm `<meta name="capyjam-owner" ...>` is present
- [ ] Test on mobile — touch joystick + drift/item buttons appear and work

---

## 🎮 Final Feature List

| Feature | Status |
|---|---|
| Kart physics (drift, mini-turbo, boost, spin-out) | ✅ |
| 4 AI opponents (3 difficulty tiers) | ✅ |
| Real-time multiplayer (WebSocket, 20Hz, ghost interpolation) | ✅ |
| Item system (banana, shell, star, mud, nitro, speed boost) | ✅ |
| Lap/checkpoint tracking + race positions | ✅ |
| Guest-first profiles + optional Google/email auth | ✅ |
| XP, leveling, Elo, global leaderboard with podium | ✅ |
| 5 unlockable capybara skins | ✅ |
| In-browser track builder (32×24 grid, 9 tile types) | ✅ |
| Community track browser + publishing | ✅ |
| Procedural sound (engine, drift, items, countdown, finish) | ✅ |
| Particle effects (exhaust, boost trail, drift sparks, confetti) | ✅ |
| Mobile touch controls (joystick + drift/item buttons) | ✅ |
| Mute toggle | ✅ |

---

## 🐛 Known Limitations / Future Work

- AI opponents don't appear in multiplayer rooms (multiplayer is human-only)
- **RaceScene always loads the built-in "Capy Jungle Circuit"** — community tracks
  published via `/build` are stored in Supabase and listed in the Track Browser,
  but `/race/:trackId` for a custom track UUID does not yet fetch and render that
  track's tile data. `Track.trackFromSupabaseRow()` exists for this purpose;
  wiring it requires an async track-load step before `RaceScene.create()`.
  `incrementTrackPlays()` is similarly defined but not yet called for the same reason.
- Track builder doesn't yet support custom rotations or multi-tile objects
- Server-side physics validation is minimal (anti-cheat not implemented)
- Track thumbnails in community browser are placeholders

---

🏁 **Good luck with CapyJam!**
