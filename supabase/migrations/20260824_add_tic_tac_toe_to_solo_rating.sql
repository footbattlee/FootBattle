alter table public.tic_tac_toe_sessions
  add column if not exists user_id uuid null references auth.users(id) on delete set null;

create index if not exists tic_tac_toe_sessions_user_id_idx
  on public.tic_tac_toe_sessions(user_id, created_at desc);

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
    select 'tic_tac_toe', greatest(coalesce(score,0),0)::integer, (coalesce(score,0)>0)
    from public.tic_tac_toe_sessions where user_id=p_user_id and completed=true
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

revoke all on function public.recalculate_solo_rating(uuid) from public, anon, authenticated;
grant execute on function public.recalculate_solo_rating(uuid) to postgres, service_role;

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

drop trigger if exists trg_sync_solo_rating_live on public.tic_tac_toe_sessions;
create trigger trg_sync_solo_rating_live
after insert or update or delete on public.tic_tac_toe_sessions
for each row execute function public.sync_solo_rating_from_live_session();
