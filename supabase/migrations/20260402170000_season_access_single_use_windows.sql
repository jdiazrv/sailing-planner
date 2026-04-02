alter table public.season_access_links
  add column if not exists single_use boolean not null default false,
  add column if not exists redeemed_at timestamptz;

create index if not exists season_access_links_single_use_idx
  on public.season_access_links (single_use, redeemed_at);
