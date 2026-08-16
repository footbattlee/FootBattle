alter table public.survivor_sets
  add column if not exists title_tr text,
  add column if not exists title_en text,
  add column if not exists description_tr text,
  add column if not exists description_en text;

update public.survivor_sets
set
  title_tr = coalesce(nullif(title_tr, ''), title),
  description_tr = coalesce(nullif(description_tr, ''), description)
where title_tr is null
   or title_tr = ''
   or description_tr is null;

alter table public.daily_faceoffs
  add column if not exists title_tr text,
  add column if not exists title_en text,
  add column if not exists category_tr text,
  add column if not exists category_en text;

update public.daily_faceoffs
set
  title_tr = coalesce(nullif(title_tr, ''), title),
  category_tr = coalesce(nullif(category_tr, ''), category)
where title_tr is null
   or title_tr = ''
   or category_tr is null
   or category_tr = '';

comment on column public.survivor_sets.title_tr is 'Turkish survivor title; falls back to legacy title when needed';
comment on column public.survivor_sets.title_en is 'English survivor title; UI falls back to Turkish when empty';
comment on column public.survivor_sets.description_tr is 'Turkish survivor description';
comment on column public.survivor_sets.description_en is 'English survivor description; UI falls back to Turkish when empty';
comment on column public.daily_faceoffs.title_tr is 'Turkish faceoff title';
comment on column public.daily_faceoffs.title_en is 'English faceoff title; UI falls back to Turkish when empty';
comment on column public.daily_faceoffs.category_tr is 'Turkish faceoff category';
comment on column public.daily_faceoffs.category_en is 'English faceoff category; UI falls back to Turkish when empty';
