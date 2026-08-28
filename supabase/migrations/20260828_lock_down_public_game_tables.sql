alter table public.player_transfers enable row level security;

revoke all on table public.player_transfers from anon;
revoke all on table public.player_transfers from authenticated;

revoke execute on function public.pick_transfer_quiz_question(text, bigint[])
from anon, authenticated;

alter table public.club_nation_rematches enable row level security;

revoke all on table public.club_nation_rematches from anon;
revoke all on table public.club_nation_rematches from authenticated;
