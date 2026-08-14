create table if not exists public.halisaha_matches (
  id text primary key,
  title text not null check (char_length(title) between 1 and 80),
  match_date date not null,
  match_time time not null,
  location text not null default '' check (char_length(location) <= 120),
  target_players integer not null default 10 check (target_players between 5 and 22),
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);

create table if not exists public.halisaha_match_rsvps (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.halisaha_matches(id) on delete cascade,
  player_name text not null check (char_length(player_name) between 1 and 40),
  player_name_key text not null,
  status text not null check (status in ('yes', 'no', 'maybe')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (match_id, player_name_key)
);

create index if not exists halisaha_match_rsvps_match_id_idx
  on public.halisaha_match_rsvps(match_id);

alter table public.halisaha_matches enable row level security;
alter table public.halisaha_match_rsvps enable row level security;

-- These tables are accessed only through server-side API routes with the
-- Supabase secret key. No anon/authenticated policies are intentionally added.
