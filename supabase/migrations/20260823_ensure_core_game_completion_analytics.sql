-- Ensure completion analytics are emitted even when client-side tracking is skipped
-- (anonymous Career Path, race-completed Club Nation, and server-completed Club Clash).

create unique index if not exists analytics_events_game_completed_session_uidx
on public.analytics_events (event_name, game_name, session_id)
where event_name = 'game_completed' and session_id is not null;

create or replace function public.footbattle_track_session_completion()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_game_name text;
  v_page_path text;
  v_metadata jsonb;
begin
  if coalesce(old.completed, false) = false and coalesce(new.completed, false) = true then
    if tg_table_name = 'career_path_sessions' then
      v_game_name := 'career_path';
      v_page_path := '/career-path';
      v_metadata := jsonb_build_object(
        'score', coalesce(new.score, 0),
        'won', coalesce(new.won, false),
        'wrongCount', coalesce(new.wrong_count, 0),
        'attemptCount', coalesce(new.attempt_count, 0),
        'source', 'db_completion_trigger'
      );
    elsif tg_table_name = 'one_club_one_country_sessions' then
      v_game_name := 'club_nation';
      v_page_path := '/club-nation';
      v_metadata := jsonb_build_object(
        'score', coalesce(new.score, 0),
        'won', coalesce(new.won, false),
        'correctCount', coalesce(new.correct_count, 0),
        'wrongCount', coalesce(new.wrong_count, 0),
        'attemptCount', coalesce(new.attempt_count, 0),
        'source', 'db_completion_trigger'
      );
    elsif tg_table_name = 'club_clash_sessions' then
      v_game_name := 'club_clash';
      v_page_path := '/club-clash';
      v_metadata := jsonb_build_object(
        'score', coalesce(new.score, 0),
        'passesUsed', coalesce(new.pass_count, 0),
        'source', 'db_completion_trigger'
      );
    else
      return new;
    end if;

    insert into public.analytics_events(event_name, game_name, user_id, session_id, page_path, metadata)
    values ('game_completed', v_game_name, new.user_id, new.id::text, v_page_path, v_metadata)
    on conflict (event_name, game_name, session_id)
      where event_name = 'game_completed' and session_id is not null
      do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists career_path_completion_analytics on public.career_path_sessions;
create trigger career_path_completion_analytics
after update of completed on public.career_path_sessions
for each row execute function public.footbattle_track_session_completion();

drop trigger if exists club_nation_completion_analytics on public.one_club_one_country_sessions;
create trigger club_nation_completion_analytics
after update of completed on public.one_club_one_country_sessions
for each row execute function public.footbattle_track_session_completion();

drop trigger if exists club_clash_completion_analytics on public.club_clash_sessions;
create trigger club_clash_completion_analytics
after update of completed on public.club_clash_sessions
for each row execute function public.footbattle_track_session_completion();
