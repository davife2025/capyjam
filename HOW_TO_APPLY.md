# Session 2 Diff — Phaser 3 Game

Drop these files into your capyjam/ monorepo root, merging with the existing structure.

## Changed files
- packages/game-engine/src/Physics.ts   — drift charge, mini-turbo, spin-out, boost timer
- packages/game-engine/src/CapyKart.ts  — lap tracking, power-up effects, remote interpolation
- apps/web/game/scenes/PreloadScene.ts  — full procedural sprite generation
- apps/web/game/scenes/RaceScene.ts     — complete race loop

## New files
- apps/web/game/objects/CapySprite.ts   — Phaser sprite wrapper: particles, tints, shadow
- apps/web/game/objects/ItemBox.ts      — spinning item pickup with respawn
- apps/web/game/hud/RaceHUD.ts          — full HUD: lap, speed, position, minimap, countdown
- apps/web/game/ai/AIDriver.ts          — waypoint AI with easy/medium/hard difficulty

## Controls
| Key          | Action      |
|-------------|-------------|
| Arrow / WASD | Steer + gas |
| Shift        | Drift       |
| Space        | Use item    |
