-- FootBattle rank extensions: non-session competitive events.
-- Allows server-side one-time LP rewards for Survivor completions and daily faceoff votes.

alter table public.rank_history
  add column if not exists event_key text null;

alter table public.rank_history
  alter column game_session_id drop not null;

create unique index if not exists rank_history_event_key_uidx
  on public.rank_history(event_key)
  where event_key is not null;

alter table public.rank_history
  drop constraint if exists rank_history_source_check;

alter table public.rank_history
  add constraint rank_history_source_check
  check (game_session_id is not null or event_key is not null);

create or replace function public.footbattle_apply_rank_event(
  p_user_id uuid,
  p_event_key text,
  p_game_code text,
  p_lp_change integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season uuid;
  v_existing public.user_rank_progress%rowtype;
  v_before integer;
  v_after integer;
  v_rank_before text;
  v_rank_after text;
  v_existing_history public.rank_history%rowtype;
begin
  if p_user_id is null
     or nullif(trim(p_event_key), '') is null
     or nullif(trim(p_game_code), '') is null
     or p_lp_change is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_input');
  end if;

  -- Serialize the same event so repeated requests cannot award LP twice.
  perform pg_advisory_xact_lock(hashtext(p_event_key));

  select * into v_existing_history
    from public.rank_history
   where event_key = p_event_key
   limit 1;

  if found then
    return jsonb_build_object(
      'ok', true,
      'applied', false,
      'already_processed', true,
      'lp_change', v_existing_history.lp_change,
      'lp_after', v_existing_history.lp_after,
      'rank_after', v_existing_history.rank_after
    );
  end if;

  select id into v_season
    from public.rank_seasons
   where is_active = true
   order by starts_at desc
   limit 1;

  if v_season is null then
    return jsonb_build_object('ok', false, 'reason', 'no_active_season');
  end if;

  insert into public.user_rank_progress(user_id, season_id)
  values (p_user_id, v_season)
  on conflict (user_id, season_id) do nothing;

  select * into v_existing
    from public.user_rank_progress
   where user_id = p_user_id
     and season_id = v_season
   for update;

  v_before := coalesce(v_existing.lp, 0);
  v_rank_before := public.footbattle_rank_for_lp(v_before);
  v_after := greatest(0, v_before + p_lp_change);
  v_rank_after := public.footbattle_rank_for_lp(v_after);

  update public.user_rank_progress
     set lp = v_after,
         peak_lp = greatest(peak_lp, v_after),
         rank_code = v_rank_after,
         games_played = games_played + 1,
         wins = wins + case when p_lp_change > 0 then 1 else 0 end,
         losses = losses + case when p_lp_change < 0 then 1 else 0 end,
         updated_at = now()
   where user_id = p_user_id
     and season_id = v_season;

  insert into public.rank_history(
    user_id,
    season_id,
    game_session_id,
    event_key,
    game_code,
    lp_before,
    lp_change,
    lp_after,
    rank_before,
    rank_after
  ) values (
    p_user_id,
    v_season,
    null,
    p_event_key,
    p_game_code,
    v_before,
    p_lp_change,
    v_after,
    v_rank_before,
    v_rank_after
  );

  return jsonb_build_object(
    'ok', true,
    'applied', true,
    'already_processed', false,
    'lp_before', v_before,
    'lp_change', p_lp_change,
    'lp_after', v_after,
    'rank_before', v_rank_before,
    'rank_after', v_rank_after
  );
end;
$$;

revoke all on function public.footbattle_apply_rank_event(uuid, text, text, integer) from public;
revoke all on function public.footbattle_apply_rank_event(uuid, text, text, integer) from anon;
revoke all on function public.footbattle_apply_rank_event(uuid, text, text, integer) from authenticated;
grant execute on function public.footbattle_apply_rank_event(uuid, text, text, integer) to service_role;
