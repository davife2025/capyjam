-- Migration 006: Replay storage

-- ── Replays table ───────────────────────────────────────────────────────────
create table if not exists public.replays (
  id          uuid primary key,
  player_id   uuid references public.profiles(id) on delete cascade,
  track_id    uuid not null references public.tracks(id) on delete cascade,
  total_time  numeric not null,
  finish_pos  integer not null,
  lap_times   numeric[] not null default '{}',
  storage_url text not null,
  created_at  timestamptz not null default now()
);

alter table public.replays enable row level security;

create policy "replays_select_all"
  on public.replays for select using (true);

create policy "replays_insert_own"
  on public.replays for insert
  with check (auth.uid() = player_id);

create policy "replays_delete_own"
  on public.replays for delete
  using (auth.uid() = player_id);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_replays_track_best
  on public.replays(track_id, total_time)
  where finish_pos = 1;

create index if not exists idx_replays_player
  on public.replays(player_id, created_at desc);

-- ── Storage bucket for replay JSON files ──────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('replays', 'replays', true, 2097152) -- 2MB limit per replay
on conflict (id) do nothing;

-- Storage policies: anyone can read, only owner can write/delete
create policy "replay_files_select_all"
  on storage.objects for select
  using (bucket_id = 'replays');

create policy "replay_files_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'replays'
    and (storage.foldername(name))[1] = 'replays'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "replay_files_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'replays'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- ── Cleanup: keep only top 10 replays per track ───────────────────────────────
create or replace function public.prune_track_replays(p_track_id uuid)
returns void language plpgsql security definer as $$
begin
  delete from public.replays
  where track_id = p_track_id
    and id not in (
      select id from public.replays
      where track_id = p_track_id
      order by total_time asc
      limit 10
    );
end;
$$;
