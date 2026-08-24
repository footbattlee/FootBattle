create or replace function public.recalculate_solo_rating(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer := 0;
  v_games_played integer := 0;
  v_games_count integer := 0;
  v_wins integer := 0;
begin
  with live_results as (
    select 'wordle'::text game_code, greatest(coalesce(score,0),0)::integer score, coalesce(won,false) won
    from public.wordle_sessions where user_id=p_user_id and completed=true
    union all
    select 'guess_the_player', greatest(coalesce(score,0),0)::integer, coalesce(won,false)
    from public.guess_player_sessions where user_id=p_user_id and completed=true
    union all
    select 'player_quiz', least(greatest(coalesce(score,0),0),250)::integer, coalesce(won,false)
    from public.player_quiz_sessions where user_id=p_user_id and completed=true
    union all
    select 'career_path', greatest(coalesce(score,0),0)::integer, coalesce(won,false)
    from public.career_path_sessions where user_id=p_user_id and completed=true
    union all
    select 'club_clash', greatest(coalesce(score,0),0)::integer, (coalesce(score,0)>0)
    from public.club_clash_sessions where user_id=p_user_id and completed=true
    union all
    select 'club_nation', greatest(coalesce(score,0),0)::integer, coalesce(won,false)
    from public.one_club_one_country_sessions where user_id=p_user_id and completed=true
  )
  select
    coalesce(sum(score),0)::integer,
    count(*)::integer,
    count(distinct game_code)::integer,
    count(*) filter (where won)::integer
  into v_points, v_games_played, v_games_count, v_wins
  from live_results;

  insert into public.solo_rating_progress(user_id,rating,games_played,games_count,wins,updated_at)
  values (p_user_id,v_points,v_games_played,v_games_count,v_wins,now())
  on conflict (user_id) do update set
    rating=excluded.rating,
    games_played=excluded.games_played,
    games_count=excluded.games_count,
    wins=excluded.wins,
    updated_at=now();
end;
$$;

update public.player_quiz_sessions
set score = 250
where completed = true and coalesce(score,0) > 250;

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
