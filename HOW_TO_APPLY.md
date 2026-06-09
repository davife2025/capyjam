# Session 5 Diff — Track Builder + Community Tracks

Drop into capyjam/ monorepo root, merging with existing structure.

## Changed files (2)
- packages/game-engine/src/Track.ts   — added trackFromSupabaseRow() helper
- apps/web/app/page.tsx               — homepage links to /build

## New files (8)
- apps/web/app/build/page.tsx         — builder page with Editor / Community tabs
- apps/web/components/TrackEditor.tsx — Canvas paint editor (32×24 grid, zoom/pan, hotkeys)
- apps/web/components/TilePalette.tsx — 9-tile palette sidebar with hotkeys 1–9
- apps/web/components/TrackBrowser.tsx — community track grid (sort by plays or newest)
- apps/web/lib/track-storage.ts       — draft localStorage, validation, publish, getCommunityTracks
- apps/web/game/scenes/BuildScene.ts  — Phaser preview scene for built tracks
- supabase/migrations/005_tracks.sql  — track_ratings, increment_track_plays(), FTS index, Realtime
- supabase/functions/validate-track/  — server-side track validation edge function

## Track Editor features
- 32×24 tile grid painted with mouse
- 9 tile types: road, grass, dirt, boost, mud, finish, start, item-box, checkpoint
- Hotkeys 1–9 to switch tiles, 0 for eraser
- Right-click to erase
- Scroll to zoom (50%–300%), middle-drag to pan
- Auto-saves draft to localStorage every change
- Client-side validation before publish
- One-click publish to Supabase; get a race link instantly

## Run migrations
```bash
supabase db push   # applies 005_tracks.sql
supabase functions deploy validate-track
```
