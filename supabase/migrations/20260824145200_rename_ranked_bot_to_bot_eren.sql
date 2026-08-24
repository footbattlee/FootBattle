create or replace function public.normalize_ranked_bot_name()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'ranked_matches' then
    if new.opponent_kind = 'bot' then
      new.bot_name := 'Bot Eren :)';
    end if;
  elsif tg_table_name = 'guest_challenges' then
    if new.opponent_guest_id is not null and new.opponent_user_id is null then
      new.opponent_name := 'Bot Eren :)';
    end if;
  end if;
  return new;
end;
$$;

update public.ranked_matches
set bot_name = 'Bot Eren :)'
where opponent_kind = 'bot' and coalesce(bot_name, '') <> 'Bot Eren :)';

update public.guest_challenges
set opponent_name = 'Bot Eren :)'
where opponent_guest_id is not null and opponent_user_id is null and coalesce(opponent_name, '') <> 'Bot Eren :)';
