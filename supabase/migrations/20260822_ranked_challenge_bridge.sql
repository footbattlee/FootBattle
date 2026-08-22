alter table if exists public.ranked_matches
  add column if not exists challenge_token text null;

create unique index if not exists ranked_matches_challenge_token_uidx
  on public.ranked_matches(challenge_token)
  where challenge_token is not null;
