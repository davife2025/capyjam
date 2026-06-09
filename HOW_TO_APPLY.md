# Session 3 Diff — Real-time Multiplayer

Drop into your capyjam/ monorepo root, merging with existing structure.

## Changed files (4)
- apps/server/src/types.ts       — ServerPlayer tracks lap data per connection
- apps/server/src/rooms.ts       — finished player registry, room snapshots
- apps/server/src/gameLoop.ts    — 20Hz broadcast, checkpoint/lap/finish handlers
- apps/server/src/index.ts       — full WS routing (checkpoint, lap, finish, chat)
- apps/web/components/Lobby.tsx  — Supabase realtime + create room + server status
- apps/web/game/scenes/RaceScene.ts — multiplayer: ghost cars, net uplink, server countdown

## New files (5)
- apps/web/lib/ws-client.ts           — typed WS client with reconnect + message queue
- apps/web/game/net/NetManager.ts     — event-based network manager at 20Hz
- apps/web/game/net/GhostCar.ts       — remote player with 100ms snapshot buffer interpolation
- apps/web/components/RoomCard.tsx    — lobby room card component
- supabase/migrations/003_rooms.sql   — room_registry + Supabase Realtime for lobby

## How multiplayer works
1. /race/quick  → solo, 4 AI opponents
2. /race/:id    → WebSocket join → ghost cars for all remote players
3. Server broadcasts positions at 20Hz; GhostCar interpolates with 100ms delay
4. Server-triggered countdown syncs all clients to start simultaneously
5. Checkpoints + laps reported up; server computes final standings
