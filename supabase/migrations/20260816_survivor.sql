-- FootBattle Survivor / bracket mode

create table if not exists public.survivor_sets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(slug) between 2 and 80),
  title text not null check (char_length(title) between 2 and 100),
  description text not null default '' check (char_length(description) <= 240),
  kind text not null default 'player' check (kind in ('player', 'team')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.survivor_entries (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.survivor_sets(id) on delete cascade,
  slot integer not null check (slot between 1 and 16),
  name text not null check (char_length(name) between 1 and 100),
  image_url text null,
  source_player_id bigint null,
  created_at timestamptz not null default now(),
  unique (set_id, slot)
);

create table if not exists public.survivor_results (
  id uuid primary key default gen_random_uuid(),
  share_token text not null unique check (char_length(share_token) between 12 and 80),
  set_id uuid not null references public.survivor_sets(id) on delete cascade,
  champion_entry_id uuid null references public.survivor_entries(id) on delete set null,
  champion_name text not null,
  bracket jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists survivor_sets_active_idx on public.survivor_sets(is_active, created_at desc);
create index if not exists survivor_entries_set_idx on public.survivor_entries(set_id, slot);
create index if not exists survivor_results_set_idx on public.survivor_results(set_id, created_at desc);

alter table public.survivor_sets enable row level security;
alter table public.survivor_entries enable row level security;
alter table public.survivor_results enable row level security;

-- These tables are intentionally accessed through server-side API routes with the Supabase secret key.
