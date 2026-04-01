create table public.season_access_links (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references public.boats (id) on delete cascade,
  season_id uuid not null references public.seasons (id) on delete cascade,
  token_hash text not null unique,
  created_by_user_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_access_at timestamptz,
  access_count integer not null default 0,
  constraint season_access_links_access_count_check check (access_count >= 0)
);

create index season_access_links_boat_id_idx
  on public.season_access_links (boat_id);

create index season_access_links_season_id_idx
  on public.season_access_links (season_id);

create index season_access_links_token_hash_idx
  on public.season_access_links (token_hash);

create index season_access_links_active_idx
  on public.season_access_links (season_id, revoked_at, expires_at desc);

alter table public.season_access_links enable row level security;

create policy "season_access_links_select_manager_or_superuser"
on public.season_access_links
for select
using (
  public.current_user_is_superuser()
  or public.can_manage_boat_users(boat_id)
);

create policy "season_access_links_insert_manager_or_superuser"
on public.season_access_links
for insert
with check (
  public.current_user_is_superuser()
  or public.can_manage_boat_users(boat_id)
);

create policy "season_access_links_update_manager_or_superuser"
on public.season_access_links
for update
using (
  public.current_user_is_superuser()
  or public.can_manage_boat_users(boat_id)
)
with check (
  public.current_user_is_superuser()
  or public.can_manage_boat_users(boat_id)
);

create policy "season_access_links_delete_manager_or_superuser"
on public.season_access_links
for delete
using (
  public.current_user_is_superuser()
  or public.can_manage_boat_users(boat_id)
);

grant select, insert, update, delete on public.season_access_links to authenticated;

create or replace function public.record_season_access_link_hit(p_link_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.season_access_links
  set
    access_count = access_count + 1,
    last_access_at = timezone('utc', now())
  where id = p_link_id;
$$;

grant execute on function public.record_season_access_link_hit(uuid) to authenticated;
