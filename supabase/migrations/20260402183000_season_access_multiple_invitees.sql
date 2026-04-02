alter table public.season_access_links
  add column if not exists invitee_name text;

create index if not exists season_access_links_season_created_idx
  on public.season_access_links (season_id, created_at desc);
