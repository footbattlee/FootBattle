-- FootBattle progression system
-- Safe to run after the existing game_results/profiles tables exist.

create table if not exists public.user_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  xp bigint not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  current_streak integer not null default 0 check (current_streak >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  last_play_date date null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.achievement_definitions (
  code text primary key,
  title text not null,
  description text not null,
  icon text not null default '🏆',
  category text not null default 'general',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_code text not null references public.achievement_definitions(code) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_code)
);

create index if not exists user_progress_level_idx
  on public.user_progress(level desc, xp desc);
create index if not exists user_achievements_user_idx
  on public.user_achievements(user_id, unlocked_at desc);

alter table public.user_progress enable row level security;
alter table public.achievement_definitions enable row level security;
alter table public.user_achievements enable row level security;

drop policy if exists "progress readable by owner" on public.user_progress;
create policy "progress readable by owner"
  on public.user_progress for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "achievement definitions readable" on public.achievement_definitions;
create policy "achievement definitions readable"
  on public.achievement_definitions for select
  to authenticated, anon
  using (is_active = true);

drop policy if exists "achievements readable by owner" on public.user_achievements;
create policy "achievements readable by owner"
  on public.user_achievements for select
  to authenticated
  using (auth.uid() = user_id);

insert into public.achievement_definitions(code, title, description, icon, category, sort_order)
values
  ('first_game', 'İlk Düdük', 'FootBattle’da ilk oyununu tamamla.', '⚽', 'games', 10),
  ('first_win', 'İlk Zafer', 'İlk oyununu kazan.', '🏆', 'wins', 20),
  ('games_10', 'Isınmaya Başladın', '10 oyun tamamla.', '🎮', 'games', 30),
  ('games_50', 'Arena Müdavimi', '50 oyun tamamla.', '🏟️', 'games', 40),
  ('games_100', 'Yüzler Kulübü', '100 oyun tamamla.', '💯', 'games', 50),
  ('wins_10', 'Kazanan Alışkanlığı', '10 galibiyete ulaş.', '🥇', 'wins', 60),
  ('wins_25', 'Seri Kazanan', '25 galibiyete ulaş.', '👑', 'wins', 70),
  ('score_1000', 'Dört Hane', 'Toplam 1.000 puana ulaş.', '✨', 'score', 80),
  ('score_5000', 'Puan Makinesi', 'Toplam 5.000 puana ulaş.', '🚀', 'score', 90),
  ('streak_3', 'Üç Gün Üst Üste', '3 günlük oynama serisine ulaş.', '🔥', 'streak', 100),
  ('streak_7', 'Haftayı Kapattın', '7 günlük oynama serisine ulaş.', '🔥', 'streak', 110),
  ('level_5', 'Seviye 5', '5. seviyeye ulaş.', '⭐', 'level', 120),
  ('level_10', 'Seviye 10', '10. seviyeye ulaş.', '🌟', 'level', 130)
on conflict (code) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  category = excluded.category,
  sort_order = excluded.sort_order,
  is_active = true;

create or replace function public.footbattle_level_for_xp(p_xp bigint)
returns integer
language sql
immutable
as $$
  select greatest(1, floor(sqrt(greatest(p_xp, 0)::numeric / 250.0))::integer + 1)
$$;

create or replace function public.footbattle_xp_for_result(p_score integer, p_won boolean)
returns integer
language sql
immutable
as $$
  select 40
       + least(160, greatest(0, coalesce(p_score, 0)) / 3)
       + case when coalesce(p_won, false) then 60 else 0 end
$$;

create or replace function public.footbattle_award_achievements(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_games integer := 0;
  v_wins integer := 0;
  v_score bigint := 0;
  v_level integer := 1;
  v_streak integer := 0;
begin
  select count(*),
         count(*) filter (where won = true),
         coalesce(sum(score), 0)
    into v_games, v_wins, v_score
    from public.game_results
   where user_id = p_user_id;

  select coalesce(level, 1), coalesce(current_streak, 0)
    into v_level, v_streak
    from public.user_progress
   where user_id = p_user_id;

  insert into public.user_achievements(user_id, achievement_code)
  select p_user_id, x.code
  from (values
    ('first_game', v_games >= 1),
    ('first_win', v_wins >= 1),
    ('games_10', v_games >= 10),
    ('games_50', v_games >= 50),
    ('games_100', v_games >= 100),
    ('wins_10', v_wins >= 10),
    ('wins_25', v_wins >= 25),
    ('score_1000', v_score >= 1000),
    ('score_5000', v_score >= 5000),
    ('streak_3', v_streak >= 3),
    ('streak_7', v_streak >= 7),
    ('level_5', v_level >= 5),
    ('level_10', v_level >= 10)
  ) as x(code, earned)
  where x.earned
  on conflict do nothing;
end;
$$;

create or replace function public.footbattle_apply_progression()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_xp_gain integer;
  v_today date;
  v_existing public.user_progress%rowtype;
  v_next_streak integer;
  v_next_xp bigint;
begin
  if new.user_id is null then
    return new;
  end if;

  v_today := coalesce(new.play_date, (new.created_at at time zone 'Europe/Istanbul')::date);
  v_xp_gain := public.footbattle_xp_for_result(new.score, new.won);

  insert into public.user_progress(user_id)
  values (new.user_id)
  on conflict (user_id) do nothing;

  select * into v_existing
    from public.user_progress
   where user_id = new.user_id
   for update;

  if v_existing.last_play_date is null then
    v_next_streak := 1;
  elsif v_existing.last_play_date = v_today then
    v_next_streak := v_existing.current_streak;
  elsif v_existing.last_play_date = v_today - 1 then
    v_next_streak := v_existing.current_streak + 1;
  elsif v_existing.last_play_date < v_today - 1 then
    v_next_streak := 1;
  else
    v_next_streak := v_existing.current_streak;
  end if;

  v_next_xp := v_existing.xp + v_xp_gain;

  update public.user_progress
     set xp = v_next_xp,
         level = public.footbattle_level_for_xp(v_next_xp),
         current_streak = v_next_streak,
         best_streak = greatest(best_streak, v_next_streak),
         last_play_date = greatest(coalesce(last_play_date, v_today), v_today),
         updated_at = now()
   where user_id = new.user_id;

  update public.profiles
     set current_streak = v_next_streak,
         best_streak = greatest(coalesce(best_streak, 0), v_next_streak)
   where id = new.user_id;

  perform public.footbattle_award_achievements(new.user_id);
  return new;
end;
$$;

drop trigger if exists trg_footbattle_progression on public.game_results;
create trigger trg_footbattle_progression
after insert on public.game_results
for each row execute function public.footbattle_apply_progression();

-- Backfill existing users from historical results. This is idempotent.
insert into public.user_progress(user_id, xp, level, current_streak, best_streak, last_play_date)
select p.id,
       coalesce(r.xp, 0),
       public.footbattle_level_for_xp(coalesce(r.xp, 0)),
       coalesce(p.current_streak, 0),
       coalesce(p.best_streak, 0),
       r.last_play_date
from public.profiles p
left join (
  select user_id,
         sum(public.footbattle_xp_for_result(score, won))::bigint as xp,
         max(play_date) as last_play_date
  from public.game_results
  where user_id is not null
  group by user_id
) r on r.user_id = p.id
on conflict (user_id) do update set
  xp = excluded.xp,
  level = excluded.level,
  current_streak = greatest(public.user_progress.current_streak, excluded.current_streak),
  best_streak = greatest(public.user_progress.best_streak, excluded.best_streak),
  last_play_date = coalesce(excluded.last_play_date, public.user_progress.last_play_date),
  updated_at = now();

select public.footbattle_award_achievements(id) from public.profiles;
