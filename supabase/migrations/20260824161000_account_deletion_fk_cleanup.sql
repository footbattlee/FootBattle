alter table public.game_sessions
  drop constraint if exists game_sessions_user_id_fkey;

alter table public.game_sessions
  add constraint game_sessions_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete set null;
