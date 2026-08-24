create or replace function public.normalize_ranked_bot_name()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'ranked_matches' then
    if new.opponent_kind = 'bot' then
      new.bot_name := 'Eren :)';
    end if;
  elsif tg_table_name = 'guest_challenges' then
    if new.opponent_guest_id is not null and new.opponent_user_id is null then
      new.opponent_name := 'Eren :)';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_normalize_ranked_bot_name on public.ranked_matches;
create trigger trg_normalize_ranked_bot_name
before insert or update on public.ranked_matches
for each row execute function public.normalize_ranked_bot_name();

drop trigger if exists trg_normalize_guest_bot_name on public.guest_challenges;
create trigger trg_normalize_guest_bot_name
before insert or update on public.guest_challenges
for each row execute function public.normalize_ranked_bot_name();

update public.ranked_matches
set bot_name = 'Eren :)'
where opponent_kind = 'bot' and coalesce(bot_name, '') <> 'Eren :)';

update public.guest_challenges
set opponent_name = 'Eren :)'
where opponent_guest_id is not null and opponent_user_id is null and coalesce(opponent_name, '') <> 'Eren :)';
