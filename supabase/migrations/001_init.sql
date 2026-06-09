-- CapyJam: Capybara Racing
-- Migration 001: Core schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Profiles ─────────────────────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique check (length(username) between 2 and 24),
  skin        text not null default 'capy-default',
  xp          integer not null default 0 check (xp >= 0),
  elo         integer not null default 1000 check (elo >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Tracks ────────────────────────────────────────────────────────────────────
create table public.tracks (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null check (length(name) between 2 and 48),
  author_id       uuid references public.profiles(id) on delete set null,
  tiles           jsonb not null default '[]',
  width           integer not null check (width > 0),
  height          integer not null check (height > 0),
  checkpoints     jsonb not null default '[]',
  start_positions jsonb not null default '[]',
  published       boolean not null default false,
  plays           integer not null default 0,
  rating          numeric(3,2) not null default 0,
  created_at      timestamptz not null default now()
);

-- Built-in track
insert into public.tracks (id, name, width, height, tiles, checkpoints, start_positions, published)
values (
  '00000000-0000-0000-0000-000000000001',
  'Capy Jungle Circuit',
  32, 20,
  '[]'::jsonb,
  '[{"x": 960, "y": 256}, {"x": 1856, "y": 576}, {"x": 960, "y": 960}, {"x": 128, "y": 576}]'::jsonb,
  '[{"x":896,"y":160,"angle":0},{"x":960,"y":160,"angle":0},{"x":896,"y":224,"angle":0},{"x":960,"y":224,"angle":0}]'::jsonb,
  true
);

-- ── Races ─────────────────────────────────────────────────────────────────────
create table public.races (
  id          uuid primary key default uuid_generate_v4(),
  track_id    uuid not null references public.tracks(id),
  status      text not null default 'waiting'
                check (status in ('waiting','countdown','racing','finished')),
  max_players integer not null default 8 check (max_players between 1 and 8),
  total_laps  integer not null default 3 check (total_laps between 1 and 10),
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz
);

-- ── Race results ──────────────────────────────────────────────────────────────
create table public.race_results (
  id          uuid primary key default uuid_generate_v4(),
  race_id     uuid not null references public.races(id) on delete cascade,
  player_id   uuid references public.profiles(id) on delete set null,
  guest_name  text,                -- for anonymous players
  position    integer not null check (position > 0),
  total_time  numeric not null,    -- milliseconds
  lap_times   numeric[] not null default '{}',
  created_at  timestamptz not null default now(),
  constraint player_or_guest check (player_id is not null or guest_name is not null)
);

-- ── Items / power-ups catalog ─────────────────────────────────────────────────
create table public.items (
  id          uuid primary key default uuid_generate_v4(),
  type        text not null unique,
  name        text not null,
  xp_required integer not null default 0,
  created_at  timestamptz not null default now()
);

insert into public.items (type, name, xp_required) values
  ('speed-boost', 'Speed Boost',  0),
  ('banana',      'Banana Peel',  0),
  ('shell',       'Shell',        0),
  ('star',        'Star',         500),
  ('mud-splash',  'Mud Splash',   0),
  ('nitro',       'Nitro',        1200);

-- ── Profile auto-create on signup ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'Capy_' || substring(new.id::text, 1, 6))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── updated_at trigger ────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger touch_profiles_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ── Elo update function ───────────────────────────────────────────────────────
create or replace function public.update_elo(p_winner_id uuid, p_loser_id uuid)
returns void language plpgsql security definer as $$
declare
  winner_elo integer;
  loser_elo  integer;
  k_factor   integer := 32;
  expected_w numeric;
  expected_l numeric;
  new_winner integer;
  new_loser  integer;
begin
  select elo into winner_elo from public.profiles where id = p_winner_id;
  select elo into loser_elo  from public.profiles where id = p_loser_id;

  expected_w := 1.0 / (1 + power(10, (loser_elo - winner_elo) / 400.0));
  expected_l := 1.0 - expected_w;

  new_winner := winner_elo + round(k_factor * (1 - expected_w));
  new_loser  := greatest(0, loser_elo + round(k_factor * (0 - expected_l)));

  update public.profiles set elo = new_winner, xp = xp + 150 where id = p_winner_id;
  update public.profiles set elo = new_loser,  xp = xp + 50  where id = p_loser_id;
end;
$$;

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index idx_profiles_elo       on public.profiles(elo desc);
create index idx_profiles_username  on public.profiles(username);
create index idx_race_results_race  on public.race_results(race_id);
create index idx_tracks_published   on public.tracks(published, plays desc);
create index idx_races_status       on public.races(status);
