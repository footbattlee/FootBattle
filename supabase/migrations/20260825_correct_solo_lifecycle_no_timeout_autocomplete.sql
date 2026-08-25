create or replace function public.reconcile_solo_session_lifecycle()
returns table(timed_completed integer, stale_abandoned integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stale integer := 0;
begin
  -- Completion is explicit and server-verified by each game's result/finish endpoint.
  -- Timer expiry alone is not enough because the player may have left early.
  update public.game_sessions
     set status = 'abandoned',
         updated_at = now(),
         metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('abandoned_reason','stale_30m')
   where mode = 'solo'
     and status = 'active'
     and started_at <= now() - interval '30 minutes';
  get diagnostics v_stale = row_count;

  return query select 0, v_stale;
end;
$$;
