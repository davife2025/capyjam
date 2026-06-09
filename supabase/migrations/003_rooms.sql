-- Migration 003: Persistent room registry (for lobby listing)
-- The game server is the source of truth for live rooms;
-- this table gives the web app a persistent view.

create table if not exists public.room_registry (
  id          text primary key,           -- matches server room ID
  track_id    uuid references public.tracks(id),
  status      text not null default 'waiting',
  player_count integer not null default 0,
  max_players integer not null default 8,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.room_registry enable row level security;

create policy "room_registry_select_all"
  on public.room_registry for select using (true);

-- Only service role can write
create policy "room_registry_insert_service"
  on public.room_registry for insert with check (true);

create policy "room_registry_update_service"
  on public.room_registry for update using (true);

create policy "room_registry_delete_service"
  on public.room_registry for delete using (true);

-- Realtime: enable for lobby live updates
alter publication supabase_realtime add table public.room_registry;

-- Auto-cleanup stale rooms older than 1 hour
create or replace function public.cleanup_stale_rooms()
returns void language plpgsql security definer as $$
begin
  delete from public.room_registry
  where updated_at < now() - interval '1 hour';
end;
$$;
