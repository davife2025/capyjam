# Session 6 Diff — Polish, Audio, Mobile, Deploy

Drop into capyjam/ monorepo root, merging with existing structure.

## Changed files (4)
- apps/web/app/layout.tsx              — OG meta, footer, ownership tag comment
- apps/web/game/scenes/RaceScene.ts    — wired SoundManager + ParticleManager + TouchControls
- apps/web/game/objects/CapySprite.ts  — removed broken __WHITE particle dep
- apps/web/game/hud/RaceHUD.ts         — countdown plays tick/GO sounds

## New files (6)
- apps/web/game/audio/SoundManager.ts  — 100% procedural Web Audio, no asset files
- apps/web/game/fx/ParticleManager.ts  — exhaust, boost trail, drift sparks, confetti
- apps/web/game/input/TouchControls.ts — virtual joystick + drift/item buttons
- apps/web/vercel.json                 — Vercel deploy config
- fly.toml                             — Fly.io game server config
- SUBMISSION.md                        — full checklist + deploy steps

## Quick deploy
```bash
supabase db push && supabase functions deploy rank-update validate-track
fly launch && fly deploy
vercel deploy --prod
```

## Before submitting
Edit apps/web/app/layout.tsx line with capyjam-owner meta tag:
  <meta name="capyjam-owner" content="YOUR_CAPYJAM_USERNAME" />
