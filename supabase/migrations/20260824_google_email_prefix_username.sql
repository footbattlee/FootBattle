create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  email_prefix text;
  candidate text;
begin
  requested_username := lower(nullif(btrim(new.raw_user_meta_data ->> 'username'), ''));
  email_prefix := lower(nullif(split_part(coalesce(new.email, ''), '@', 1), ''));
  email_prefix := regexp_replace(coalesce(email_prefix, ''), '[^a-z0-9._-]+', '', 'g');

  candidate := coalesce(requested_username, nullif(email_prefix, ''));

  if candidate is not null and exists (
    select 1 from public.profiles p where lower(p.username) = lower(candidate)
  ) then
    candidate := left(candidate, 20) || '_' || left(replace(new.id::text, '-', ''), 6);
  end if;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    candidate,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(email_prefix, ''),
      'FootBattle Oyuncusu'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
