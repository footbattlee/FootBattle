-- Restrict internal SECURITY DEFINER functions and remove ranked DB linter warnings.

alter function public.footbattle_rank_for_elo(integer) set search_path = public;

revoke all on function public.footbattle_apply_ranked_elo() from public, anon, authenticated;
grant execute on function public.footbattle_apply_ranked_elo() to service_role;

revoke all on function public.recalculate_solo_rating(uuid) from public, anon, authenticated;
grant execute on function public.recalculate_solo_rating(uuid) to service_role;

revoke all on function public.sync_solo_rating_from_game_result() from public, anon, authenticated;
grant execute on function public.sync_solo_rating_from_game_result() to service_role;

revoke all on function public.footbattle_track_session_completion() from public, anon, authenticated;
grant execute on function public.footbattle_track_session_completion() to service_role;

create index if not exists ranked_elo_history_season_id_idx on public.ranked_elo_history(season_id);
create index if not exists ranked_elo_history_user_id_idx on public.ranked_elo_history(user_id);
create index if not exists ranked_matches_winner_user_id_idx on public.ranked_matches(winner_user_id);

drop policy if exists "ranked matches participants read" on public.ranked_matches;
create policy "ranked matches participants read" on public.ranked_matches
for select to authenticated
using ((select auth.uid()) = player_a_id or (select auth.uid()) = player_b_id);

drop policy if exists "ranked elo history readable by owner" on public.ranked_elo_history;
create policy "ranked elo history readable by owner" on public.ranked_elo_history
for select to authenticated
using ((select auth.uid()) = user_id);
