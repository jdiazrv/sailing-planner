alter table public.season_access_links
  add column if not exists can_view_visits boolean not null default true;
