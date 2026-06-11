# Session 9 Diff — Critical Fixes (post-build review)

Drop into capyjam/ monorepo root, merging with existing structure.

## New files (6) — build configuration
- apps/web/tsconfig.json              — CRITICAL: defines `@/*` path alias used by
                                         every import across the codebase. Without
                                         this, the app would fail to resolve imports.
- apps/web/postcss.config.mjs         — enables Tailwind/autoprefixer processing
- apps/server/tsconfig.json           — needed for `pnpm build`/`type-check`
- packages/types/tsconfig.json        — needed for `pnpm type-check`
- packages/game-engine/tsconfig.json  — needed for `pnpm type-check`
- packages/supabase-client/tsconfig.json — needed for `pnpm type-check`

## Changed files (5)
- apps/web/game/net/NetManager.ts — CRITICAL FIX: added `send()`, `sendCheckpoint()`,
  `sendLapComplete()`, `sendRaceFinish()`. Previously RaceScene called
  `this.net?.send?.(...)` on a method that didn't exist — optional chaining made
  this silently no-op, so multiplayer races NEVER reported checkpoints/laps/finish
  to the server.
- apps/web/game/scenes/RaceScene.ts — updated 3 call sites to use the new typed
  NetManager helpers instead of the broken `send?.()` + `as never` casts.
- apps/web/components/Lobby.tsx — replaced the awkward conditional-type channel
  hack with `RealtimeChannel | undefined`, removed `@ts-ignore`.
- packages/supabase-client/src/database.types.ts — added `room_registry`,
  `skin_unlocks`, `track_ratings`, `replays` tables, `leaderboard_monthly` view,
  and `award_race_xp` / `increment_track_plays` / `prune_track_replays` functions
  (all added by migrations 003-006 but never reflected in the TS types). Also
  added `total_races`, `wins`, `best_lap_ms` to `profiles`.
- SUBMISSION.md — documented one newly-identified limitation (see below).

## Newly documented limitation
`RaceScene` always loads the built-in "Capy Jungle Circuit" via `createDefaultTrack()`.
Community tracks published through `/build` are stored correctly in Supabase and
listed in the Track Browser, but `/race/:trackId` for a custom track UUID doesn't
yet fetch and render that track. `Track.trackFromSupabaseRow()` (added in session 5)
is ready for this — it needs an async load step before `RaceScene.create()` runs.
`incrementTrackPlays()` is implemented but unused for the same reason.

This is the right thing to tackle next if you have time after the hackathon deadline,
but is NOT required for any of the hackathon's stated requirements (a single
built-in track is sufficient for "a capybara racing game with a finish line").

## Why this matters
Items 1-2 above were silent failures — the kind that work fine in dev (`pnpm dev`
with SWC, no type-checking) but would surface as either broken imports or
non-functional multiplayer race results once you run `pnpm build` /
`pnpm type-check` or deploy to Vercel (which runs a production build).
