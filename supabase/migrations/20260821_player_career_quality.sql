-- Automatic career-data quality checks for playable players.
-- Flags suspiciously short club histories; it never auto-corrects player data.

create table if not exists public.player_data_quality_issues (
  id bigserial primary key,
  player_id bigint not null,
  issue_type text not null,
  severity text not null check (severity in ('info','warning','error','critical')),
  details jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_note text
);

create index if not exists idx_player_data_quality_open
  on public.player_data_quality_issues(issue_type, severity)
  where resolved_at is null;

create unique index if not exists ux_player_quality_open_issue
  on public.player_data_quality_issues(player_id, issue_type)
  where resolved_at is null;

create or replace function public.refresh_player_career_quality_issue(p_player_id bigint)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_name text;
  v_playable smallint;
  v_pop numeric;
  v_clubs int;
  v_issue text := 'career_club_count_suspicious';
  v_severity text;
  v_rule text;
begin
  select name, is_playable, popularity_score
    into v_name, v_playable, v_pop
  from public.guess_players
  where player_id = p_player_id;

  if not found or coalesce(v_playable,0) <> 1 then
    update public.player_data_quality_issues
       set resolved_at = now(),
           resolution_note = coalesce(resolution_note,'Auto-resolved: player no longer playable or missing.')
     where player_id = p_player_id and issue_type = v_issue and resolved_at is null;
    return;
  end if;

  select count(distinct club_name)::int
    into v_clubs
  from public.player_quiz_clubs
  where player_id = p_player_id;

  if coalesce(v_pop,0) > 80 and coalesce(v_clubs,0) <= 3 then
    v_severity := 'critical';
    v_rule := 'popularity_gt_80_and_clubs_lte_3';
  elsif coalesce(v_pop,0) > 75 and coalesce(v_clubs,0) <= 2 then
    v_severity := 'error';
    v_rule := 'popularity_gt_75_and_clubs_lte_2';
  elsif coalesce(v_pop,0) > 70 and coalesce(v_clubs,0) <= 1 then
    v_severity := 'warning';
    v_rule := 'popularity_gt_70_and_clubs_lte_1';
  else
    update public.player_data_quality_issues
       set resolved_at = now(),
           resolution_note = coalesce(resolution_note,'Auto-resolved: career club count now passes configured thresholds.')
     where player_id = p_player_id and issue_type = v_issue and resolved_at is null;
    return;
  end if;

  insert into public.player_data_quality_issues(player_id, issue_type, severity, details, detected_at)
  values (
    p_player_id,
    v_issue,
    v_severity,
    jsonb_build_object(
      'player_name', v_name,
      'distinct_clubs', coalesce(v_clubs,0),
      'popularity_score', v_pop,
      'rule', v_rule
    ),
    now()
  )
  on conflict (player_id, issue_type) where resolved_at is null
  do update set severity = excluded.severity,
                details = excluded.details,
                detected_at = now();
end;
$function$;

create or replace function public.scan_player_career_quality_issues()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  n int := 0;
begin
  for r in select player_id from public.guess_players where is_playable = 1 loop
    perform public.refresh_player_career_quality_issue(r.player_id);
    n := n + 1;
  end loop;
  return n;
end;
$function$;

create or replace function public.trg_refresh_player_career_quality_issue()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_player_career_quality_issue(old.player_id);
    return old;
  end if;

  perform public.refresh_player_career_quality_issue(new.player_id);
  if tg_op = 'UPDATE' and old.player_id is distinct from new.player_id then
    perform public.refresh_player_career_quality_issue(old.player_id);
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_guess_players_career_quality on public.guess_players;
create trigger trg_guess_players_career_quality
after insert or update of player_id,is_playable,popularity_score on public.guess_players
for each row execute function public.trg_refresh_player_career_quality_issue();

drop trigger if exists trg_player_quiz_clubs_career_quality on public.player_quiz_clubs;
create trigger trg_player_quiz_clubs_career_quality
after insert or update or delete on public.player_quiz_clubs
for each row execute function public.trg_refresh_player_career_quality_issue();
