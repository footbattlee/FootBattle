create or replace function private.track_club_clash_session_analytics()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_meta jsonb;
begin
  v_meta := jsonb_build_object(
    'mode','solo',
    'score',new.score,
    'pass_count',new.pass_count,
    'max_passes',new.max_passes,
    'duration_seconds',new.duration_seconds
  );

  if tg_op = 'INSERT' then
    insert into public.analytics_events(event_name, game_name, user_id, session_id, page_path, metadata)
    values ('game_started', 'club_clash', new.user_id, new.id::text, '/club-clash', v_meta);
    return new;
  end if;

  if new.completed = true and coalesce(old.completed,false) = false then
    insert into public.analytics_events(event_name, game_name, user_id, session_id, page_path, metadata)
    values ('game_completed', 'club_clash', new.user_id, new.id::text, '/club-clash', v_meta || jsonb_build_object('completed_at',new.completed_at))
    on conflict (event_name, game_name, session_id)
      where event_name = 'game_completed' and session_id is not null
      do nothing;
  end if;

  return new;
end;
$$;
