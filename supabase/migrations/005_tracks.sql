-- Migration 005: Track enhancements

-- ── Increment play count (atomic) ─────────────────────────────────────────────
create or replace function public.increment_track_plays(p_track_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.tracks set plays = plays + 1 where id = p_track_id;
end;
$$;

-- ── Track ratings ─────────────────────────────────────────────────────────────
create table if not exists public.track_ratings (
  id         uuid primary key default uuid_generate_v4(),
  track_id   uuid not null references public.tracks(id) on delete cascade,
  player_id  uuid references public.profiles(id) on delete set null,
  rating     integer not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  unique (track_id, player_id)
);

alter table public.track_ratings enable row level security;

create policy "track_ratings_select_all"
  on public.track_ratings for select using (true);

create policy "track_ratings_insert_auth"
  on public.track_ratings for insert
  with check (auth.uid() = player_id);

-- Recompute track average rating after each rating insert/update
create or replace function public.update_track_rating()
returns trigger language plpgsql security definer as $$
begin
  update public.tracks
  set rating = (
    select coalesce(avg(rating), 0)
    from public.track_ratings
    where track_id = new.track_id
  )
  where id = new.track_id;
  return new;
end;
$$;

create trigger trg_update_track_rating
  after insert or update on public.track_ratings
  for each row execute function public.update_track_rating();

-- ── Add tags column for track discovery ───────────────────────────────────────
alter table public.tracks
  add column if not exists tags text[] not null default '{}';

-- ── Full-text search index on track name ─────────────────────────────────────
create index if not exists idx_tracks_name_fts
  on public.tracks using gin(to_tsvector('english', name));

-- ── Realtime: enable for track browser live updates ──────────────────────────
alter publication supabase_realtime add table public.tracks;
