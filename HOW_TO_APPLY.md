# Session 7 Diff — Replay System

Drop into capyjam/ monorepo root, merging with existing structure.

## Changed files (3)
- apps/web/app/profile/page.tsx     — added "My Replays" section (ReplayList)
- apps/web/game/scenes/RaceScene.ts — records every race, loads best ghost, saves on finish
- apps/web/game/hud/RaceHUD.ts      — finish screen now has "Watch Replay" button

## New files (8)
- apps/web/game/replay/ReplayRecorder.ts   — records kart state at 24Hz, delta-compresses ~60%
- apps/web/game/replay/ReplayPlayer.ts     — plays back frames with interpolation, variable speed
- apps/web/game/replay/ReplayStorage.ts    — localStorage (last 10) + Supabase upload/download
- apps/web/game/replay/GhostSprite.ts      — semi-transparent ghost kart with live time-delta display
- apps/web/game/scenes/ReplayViewerScene.ts — full playback UI: play/pause, speed (0.5x-4x), lap chips
- apps/web/components/ReplayList.tsx       — replay list with Watch / Ghost Race / Delete actions
- apps/web/app/replay/[id]/page.tsx        — replay viewer page (loads local or remote)
- supabase/migrations/006_replays.sql      — replays table, storage bucket, RLS, prune function

## How it works

### Recording
Every race auto-records at 24fps (delta-compressed to ~60% smaller).
On finish, saved to localStorage (last 10 replays kept, oldest evicted).

### Ghost racing
Starting a solo race automatically loads your best replay for that track
as a translucent ghost kart with a live +/- time delta shown above it.

### Replay viewer
`/replay/:id` — full Phaser playback with:
- Play/pause (Space)
- Speed cycling 0.5x → 1x → 2x → 4x (F)
- Restart (R)
- Per-lap time chips, best lap highlighted in gold
- Progress bar + elapsed/total time

### Compression
Frames store only deltas (position/angle/speed change since previous frame)
plus a bitfield for drift/boost/spin flags — roughly 60% smaller than raw frames.

## Run migration
```bash
supabase db push   # applies 006_replays.sql (creates 'replays' storage bucket)
```
