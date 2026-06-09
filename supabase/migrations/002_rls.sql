-- Migration 002: Row Level Security

alter table public.profiles    enable row level security;
alter table public.tracks      enable row level security;
alter table public.races       enable row level security;
alter table public.race_results enable row level security;
alter table public.items       enable row level security;

-- ── Profiles ─────────────────────────────────────────────────────────────────
-- Anyone can read profiles (for leaderboard)
create policy "profiles_select_all"
  on public.profiles for select using (true);

-- Users can only update their own profile
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── Tracks ───────────────────────────────────────────────────────────────────
-- Anyone can read published tracks
create policy "tracks_select_published"
  on public.tracks for select
  using (published = true or auth.uid() = author_id);

-- Authenticated users can create tracks
create policy "tracks_insert_auth"
  on public.tracks for insert
  with check (auth.uid() = author_id or author_id is null);

-- Authors can update their own tracks
create policy "tracks_update_own"
  on public.tracks for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- Authors can delete their own tracks
create policy "tracks_delete_own"
  on public.tracks for delete
  using (auth.uid() = author_id);

-- ── Races ─────────────────────────────────────────────────────────────────────
-- Anyone can read races
create policy "races_select_all"
  on public.races for select using (true);

-- Service role creates races (game server)
create policy "races_insert_service"
  on public.races for insert
  with check (true); -- restricted to service role via RLS bypass

-- ── Race results ──────────────────────────────────────────────────────────────
-- Anyone can read results (for leaderboards)
create policy "race_results_select_all"
  on public.race_results for select using (true);

-- Service role inserts results
create policy "race_results_insert_service"
  on public.race_results for insert with check (true);

-- ── Items ─────────────────────────────────────────────────────────────────────
-- Anyone can read items catalog
create policy "items_select_all"
  on public.items for select using (true);
