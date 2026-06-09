-- Seed: dev data for local development
-- Run with: supabase db reset

-- Sample guest race results (no auth user needed)
insert into public.races (id, track_id, status, total_laps, started_at, finished_at)
values
  ('11111111-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'finished', 3, now() - interval '2 hours', now() - interval '1 hour 55 minutes'),
  ('11111111-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'finished', 3, now() - interval '1 hour', now() - interval '55 minutes');

insert into public.race_results (race_id, guest_name, position, total_time, lap_times)
values
  ('11111111-0000-0000-0000-000000000001', 'CapySpeed',   1, 127432, '{41200, 42100, 44132}'),
  ('11111111-0000-0000-0000-000000000001', 'BananaKing',  2, 133210, '{43100, 44200, 45910}'),
  ('11111111-0000-0000-0000-000000000002', 'MudSplash',   1, 129800, '{42100, 43200, 44500}');
