create table if not exists public.match_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  competition text not null,
  match_id text not null,
  kickoff_at timestamptz not null,
  home_team text not null,
  away_team text not null,
  predicted_home smallint not null check (predicted_home between 0 and 20),
  predicted_away smallint not null check (predicted_away between 0 and 20),
  actual_home smallint check (actual_home between 0 and 50),
  actual_away smallint check (actual_away between 0 and 50),
  xp_awarded integer not null default 0 check (xp_awarded in (0,20,100)),
  status text not null default 'pending' check (status in ('pending','settled','void')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  settled_at timestamptz,
  unique (user_id, competition, match_id)
);

create index if not exists match_predictions_user_kickoff_idx
  on public.match_predictions(user_id, kickoff_at desc);
create index if not exists match_predictions_pending_idx
  on public.match_predictions(competition, match_id)
  where status = 'pending';

alter table public.match_predictions enable row level security;

drop policy if exists "match_predictions_select_own" on public.match_predictions;
create policy "match_predictions_select_own"
  on public.match_predictions for select
  using (auth.uid() = user_id);

create or replace function public.footbattle_settle_match_prediction(
  p_prediction_id uuid,
  p_actual_home integer,
  p_actual_away integer
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.match_predictions%rowtype;
  v_xp integer := 0;
  v_existing_xp bigint;
begin
  select * into v_row
  from public.match_predictions
  where id = p_prediction_id
  for update;

  if not found or v_row.status <> 'pending' then
    return coalesce(v_row.xp_awarded, 0);
  end if;

  if p_actual_home < 0 or p_actual_away < 0 then
    raise exception 'Invalid final score';
  end if;

  if v_row.predicted_home = p_actual_home and v_row.predicted_away = p_actual_away then
    v_xp := 100;
  elsif sign(v_row.predicted_home - v_row.predicted_away) = sign(p_actual_home - p_actual_away) then
    v_xp := 20;
  end if;

  update public.match_predictions
     set actual_home = p_actual_home,
         actual_away = p_actual_away,
         xp_awarded = v_xp,
         status = 'settled',
         settled_at = now(),
         updated_at = now()
   where id = p_prediction_id;

  insert into public.user_progress(user_id)
  values (v_row.user_id)
  on conflict (user_id) do nothing;

  select xp into v_existing_xp
  from public.user_progress
  where user_id = v_row.user_id
  for update;

  update public.user_progress
     set xp = v_existing_xp + v_xp,
         level = public.footbattle_level_for_xp(v_existing_xp + v_xp),
         updated_at = now()
   where user_id = v_row.user_id;

  if v_xp > 0 then
    perform public.footbattle_award_achievements(v_row.user_id);
  end if;

  return v_xp;
end;
$$;

revoke all on function public.footbattle_settle_match_prediction(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.footbattle_settle_match_prediction(uuid, integer, integer) to service_role;
