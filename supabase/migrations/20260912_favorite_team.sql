alter table public.profiles
  add column if not exists favorite_team_id text,
  add column if not exists favorite_team_name text,
  add column if not exists favorite_team_competition text,
  add column if not exists favorite_team_logo text,
  add column if not exists favorite_team_updated_at timestamptz;

comment on column public.profiles.favorite_team_id is 'External football team identifier used by FootBattle competition hubs.';
comment on column public.profiles.favorite_team_competition is 'FootBattle competition key for the selected favorite team.';
