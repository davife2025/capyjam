# Fix: Track.ts — eliminate zod dependency entirely (supersedes previous fix)

## This REPLACES the previous "capyjam-fix-zod-dependency" fix.
That fix required `pnpm install` to pick up a new dependency. This version
removes the need for game-engine to depend on zod at all, so a plain
`pnpm build` is sufficient — no reinstall needed.

## Changed files (2)
- packages/game-engine/src/Track.ts
- packages/game-engine/package.json (reverted the zod dep added previously)

## What changed
@capyjam/types already computes and exports:
  export type Track = z.infer<typeof TrackSchema>;

Track.ts (in game-engine) was redundantly re-deriving the same type via
`z.infer<typeof TrackSchema>` itself, which required importing zod's `z`
namespace AND importing `TrackSchema` (a runtime const) via `import type`
— both problematic.

Before:
  import type { TrackTile, TrackSchema } from "@capyjam/types";
  import type { SurfaceType, Vec2 } from "./Physics";
  import type { z } from "zod";

  export type TrackData = z.infer<typeof TrackSchema>;

After:
  import type { TrackTile, Track as TrackTypesData } from "@capyjam/types";
  import type { SurfaceType, Vec2 } from "./Physics";

  export type TrackData = TrackTypesData;

Same resulting shape (both ultimately come from TrackSchema in
packages/types/src/race.ts), zero zod dependency needed in game-engine.

## After applying
```bash
rm -rf apps/web/.next
pnpm build
```
(No `pnpm install` needed this time — package.json wasn't meaningfully changed.)

## If you already ran `pnpm install` from the previous fix
That's harmless — game-engine just won't use the zod dependency anymore.
You can leave it installed or remove it; either way the build will pass.
