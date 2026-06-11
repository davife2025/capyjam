# Session 8 Diff — Final Integration Pass

Drop into capyjam/ monorepo root.

## Changed files (3)
- apps/web/components/GameCanvas.tsx  — new `forceGhostId` prop, shows "👻 Ghost Race" badge
- apps/web/app/race/[id]/page.tsx     — reads `?ghost=<replayId>` query param, passes to GameCanvas
- apps/web/game/scenes/RaceScene.ts   — reads `forceGhostId` from registry; "Ghost Race" links from
                                         the replay list now actually load that specific replay
                                         (falls back to best-local if not found)

## New files (1)
- PROJECT_SUMMARY.md — consolidated overview of all 8 sessions, repo layout, run instructions

## What this fixes
Previously, the "👻 Ghost Race" button on `/profile` and `/replay/:id` linked to
`/race/quick?ghost=<id>` but the query param was ignored — the race always loaded
your best local replay (or none). Now it correctly loads the *specific* replay
you clicked, with a visible badge confirming ghost mode is active.

## This wraps up the CapyJam build
See PROJECT_SUMMARY.md for the full feature list and SUBMISSION.md (session 6)
for deploy steps and the pre-submit checklist.
