-- Compatibility patch for installations that already have public.game_sessions.
-- Run this before 20260814_game_security.sql if the main migration reports missing columns.

alter table if exists public.game_sessions
  add column if not exists source_session_id text,
  add column if not exists mode text not null default 'solo',
  add column if not exists status text not null default 'active',
  add column if not exists expires_at timestamptz null,
  add column if not exists finished_at timestamptz null,
  add column if not exists server_score integer null,
  add column if not exists won boolean null,
  add column if not exists duration_ms bigint null,
  add column if not exists suspicion_score integer not null default 0,
  add column if not exists suspicious boolean not null default false,
  add column if not exists score_blocked boolean not null default false,
  add column if not exists client_fingerprint text null,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- The universal ledger needs one row per native game session.
-- Only add the unique constraint when the required columns are present and it does not already exist.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'game_sessions' and column_name = 'game_code'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'game_sessions' and column_name = 'source_session_id'
  ) and not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'game_sessions'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) = 'UNIQUE (game_code, source_session_id)'
  ) then
    -- Existing rows with null source_session_id do not conflict with this constraint.
    alter table public.game_sessions
      add constraint game_sessions_game_code_source_session_id_key
      unique (game_code, source_session_id);
  end if;
end
$$;

create index if not exists game_sessions_user_id_idx
  on public.game_sessions(user_id, started_at desc);
create index if not exists game_sessions_game_code_idx
  on public.game_sessions(game_code, started_at desc);
create index if not exists game_sessions_suspicious_idx
  on public.game_sessions(suspicious, score_blocked, started_at desc);
