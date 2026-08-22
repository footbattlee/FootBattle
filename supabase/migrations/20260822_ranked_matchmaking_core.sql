create table if not exists public.ranked_match_queue (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  game_code text not null check (game_code in ('tic_tac_toe','club_clash')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ranked_match_queue_game_created_idx
  on public.ranked_match_queue(game_code, created_at asc);

create table if not exists public.ranked_matches (
  id uuid primary key default gen_random_uuid(),
  game_code text not null check (game_code in ('tic_tac_toe','club_clash')),
  status text not null default 'ready' check (status in ('ready','active','completed','cancelled')),
  player_a_id uuid not null references public.profiles(id) on delete cascade,
  player_b_id uuid null references public.profiles(id) on delete cascade,
  opponent_kind text not null default 'human' check (opponent_kind in ('human','bot')),
  bot_name text null,
  winner_user_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null,
  updated_at timestamptz not null default now(),
  constraint ranked_match_distinct_players check (player_b_id is null or player_a_id <> player_b_id),
  constraint ranked_match_bot_shape check (
    (opponent_kind = 'bot' and player_b_id is null and bot_name is not null)
    or (opponent_kind = 'human' and player_b_id is not null and bot_name is null)
  )
);

create index if not exists ranked_matches_player_a_idx on public.ranked_matches(player_a_id, created_at desc);
create index if not exists ranked_matches_player_b_idx on public.ranked_matches(player_b_id, created_at desc);

alter table public.ranked_match_queue enable row level security;
alter table public.ranked_matches enable row level security;

drop policy if exists "ranked matches participants read" on public.ranked_matches;
create policy "ranked matches participants read" on public.ranked_matches
for select to authenticated
using (auth.uid() = player_a_id or auth.uid() = player_b_id);

revoke all on public.ranked_match_queue from anon, authenticated;
grant select on public.ranked_matches to authenticated;
