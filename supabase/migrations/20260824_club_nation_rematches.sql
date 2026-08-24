create table if not exists public.club_nation_rematches (
  source_challenge_id bigint primary key references public.guest_challenges(id) on delete cascade,
  rematch_challenge_id bigint not null unique references public.guest_challenges(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists club_nation_rematches_rematch_idx
  on public.club_nation_rematches(rematch_challenge_id);
