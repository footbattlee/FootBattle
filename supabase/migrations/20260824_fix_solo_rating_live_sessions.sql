create or replace function public.recalculate_solo_rating(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rating integer := 1000;
  v_games_played integer := 0;
  v_games_count integer := 0;
  v_wins integer := 0;
  v_quality numeric := 0;
begin
  with live_results as (
    select 'wordle'::text game_code, score, won from public.wordle_sessions where user_id=p_user_id and completed=true
    union all
    select 'guess_the_player', score, won from public.guess_player_sessions where user_id=p_user_id and completed=true
    union all
    select 'player_quiz', score, won from public.player_quiz_sessions where user_id=p_user_id and completed=true
    union all
    select 'career_path', score, won from public.career_path_sessions where user_id=p_user_id and completed=true
    union all
    select 'club_clash', score, (coalesce(score,0)>0) from public.club_clash_sessions where user_id=p_user_id and completed=true
    union all
    select 'club_nation', score, won from public.one_club_one_country_sessions where user_id=p_user_id and completed=true
  ), per_game as (
    select game_code,
      count(*)::integer as plays,
      count(*) filter (where won)::integer as wins,
      max(greatest(coalesce(score,0),0))::numeric as best_score,
      avg(greatest(coalesce(score,0),0))::numeric as avg_score,
      case game_code
        when 'player_quiz' then 500::numeric
        when 'guess_the_player' then 250::numeric
        when 'wordle' then 200::numeric
        when 'career_path' then 200::numeric
        when 'club_clash' then 200::numeric
        when 'club_nation' then 200::numeric
        else 100::numeric
      end as target_score
    from live_results
    group by game_code
  ), scored as (
    select *,
      (least(best_score/nullif(target_score,0),1)*0.50)
      + (least(avg_score/nullif(target_score,0),1)*0.30)
      + ((wins::numeric/nullif(plays,0))*0.20) as quality
    from per_game
  )
  select coalesce(sum(plays),0), count(*), coalesce(sum(wins),0), coalesce(avg(quality),0)
  into v_games_played, v_games_count, v_wins, v_quality
  from scored;

  if v_games_count > 0 then
    v_rating := 1000 + round(600*v_quality)::integer + least(v_games_count,8)*25;
  end if;

  insert into public.solo_rating_progress(user_id,rating,games_played,games_count,wins,updated_at)
  values (p_user_id,v_rating,v_games_played,v_games_count,v_wins,now())
  on conflict (user_id) do update set
    rating=excluded.rating,
    games_played=excluded.games_played,
    games_count=excluded.games_count,
    wins=excluded.wins,
    updated_at=now();
end;
$$;

create or replace function public.sync_solo_rating_from_live_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op='DELETE' then
    if old.user_id is not null then perform public.recalculate_solo_rating(old.user_id); end if;
    return old;
  end if;
  if new.user_id is not null then perform public.recalculate_solo_rating(new.user_id); end if;
  if tg_op='UPDATE' and old.user_id is distinct from new.user_id and old.user_id is not null then
    perform public.recalculate_solo_rating(old.user_id);
  end if;
  return new;
end;
$$;

revoke all on function public.sync_solo_rating_from_live_session() from public, anon, authenticated;
grant execute on function public.sync_solo_rating_from_live_session() to postgres, service_role;

DO $$
declare t text;
begin
  foreach t in array array['wordle_sessions','guess_player_sessions','player_quiz_sessions','career_path_sessions','club_clash_sessions','one_club_one_country_sessions']
  loop
    execute format('drop trigger if exists trg_sync_solo_rating_live on public.%I', t);
    execute format('create trigger trg_sync_solo_rating_live after insert or update or delete on public.%I for each row execute function public.sync_solo_rating_from_live_session()', t);
  end loop;
end $$;

DO $$
declare r record;
begin
  for r in
    select distinct user_id from (
      select user_id from public.wordle_sessions where user_id is not null
      union select user_id from public.guess_player_sessions where user_id is not null
      union select user_id from public.player_quiz_sessions where user_id is not null
      union select user_id from public.career_path_sessions where user_id is not null
      union select user_id from public.club_clash_sessions where user_id is not null
      union select user_id from public.one_club_one_country_sessions where user_id is not null
    ) s
  loop
    perform public.recalculate_solo_rating(r.user_id);
  end loop;
end $$;
