create or replace function public.reconcile_solo_session_lifecycle()
returns table(timed_completed integer, stale_abandoned integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timed integer := 0;
  v_stale integer := 0;
  v_count integer := 0;
begin
  update public.tic_tac_toe_sessions
     set completed = true,
         completed_at = coalesce(completed_at, now())
   where coalesce(completed,false) = false
     and created_at + make_interval(secs => coalesce(duration_seconds,120)) <= now();
  get diagnostics v_count = row_count;
  v_timed := v_timed + v_count;

  update public.club_clash_sessions
     set completed = true,
         completed_at = coalesce(completed_at, now())
   where coalesce(completed,false) = false
     and created_at + make_interval(secs => coalesce(duration_seconds,120)) <= now();
  get diagnostics v_count = row_count;
  v_timed := v_timed + v_count;

  update public.one_club_one_country_sessions
     set completed = true,
         completed_at = coalesce(completed_at, now())
   where coalesce(completed,false) = false
     and coalesce(expires_at, started_at + interval '120 seconds', created_at + interval '120 seconds') <= now();
  get diagnostics v_count = row_count;
  v_timed := v_timed + v_count;

  update public.game_sessions
     set status = 'abandoned',
         updated_at = now(),
         metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('abandoned_reason','stale_30m')
   where mode = 'solo'
     and status = 'active'
     and started_at <= now() - interval '30 minutes'
     and game_code not in ('tic_tac_toe','club_clash','club_nation');
  get diagnostics v_stale = row_count;

  return query select v_timed, v_stale;
end;
$$;

revoke all on function public.reconcile_solo_session_lifecycle() from public, anon, authenticated;
grant execute on function public.reconcile_solo_session_lifecycle() to service_role, postgres;

create extension if not exists pg_cron with schema extensions;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'footbattle-reconcile-solo-lifecycle' limit 1;
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
  perform cron.schedule(
    'footbattle-reconcile-solo-lifecycle',
    '* * * * *',
    'select public.reconcile_solo_session_lifecycle();'
  );
end $$;
