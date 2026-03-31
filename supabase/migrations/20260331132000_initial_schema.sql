create extension if not exists pgcrypto;

create type public.permission_level as enum ('viewer', 'editor', 'manager');
create type public.trip_segment_status as enum ('planned', 'active', 'completed', 'cancelled');
create type public.visit_status as enum ('tentative', 'confirmed', 'cancelled');
create type public.location_type as enum ('marina', 'anchorage', 'port', 'boatyard', 'other');
create type public.place_source as enum ('manual', 'google_places', 'mapbox', 'openstreetmap', 'other');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.boats (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  is_superuser boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_boat_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  boat_id uuid not null references public.boats (id) on delete cascade,
  permission_level public.permission_level not null default 'viewer',
  can_edit boolean not null default false,
  can_view_all_visits boolean not null default false,
  can_view_visit_names boolean not null default false,
  can_view_private_notes boolean not null default false,
  can_view_only_own_visit boolean not null default false,
  can_manage_boat_users boolean not null default false,
  can_view_availability boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_boat_permissions_user_boat_key unique (user_id, boat_id),
  constraint user_boat_permissions_visibility_check check (
    not (can_view_all_visits and can_view_only_own_visit)
  )
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references public.boats (id) on delete cascade,
  year integer not null,
  start_date date not null,
  end_date date not null,
  name text not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint seasons_date_check check (start_date <= end_date),
  constraint seasons_year_check check (year between 1900 and 3000),
  constraint seasons_unique_boat_year unique (boat_id, year)
);

create table public.trip_segments (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  location_label text not null,
  location_type public.location_type not null default 'other',
  place_source public.place_source not null default 'manual',
  external_place_id text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  status public.trip_segment_status not null default 'planned',
  public_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint trip_segments_date_check check (start_date <= end_date),
  constraint trip_segments_latitude_check check (latitude is null or latitude between -90 and 90),
  constraint trip_segments_longitude_check check (longitude is null or longitude between -180 and 180)
);

create table public.trip_segment_private_notes (
  trip_segment_id uuid primary key references public.trip_segments (id) on delete cascade,
  private_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  owner_user_id uuid references public.profiles (id) on delete set null,
  visitor_name text not null,
  embark_date date not null,
  disembark_date date not null,
  embark_place_label text,
  embark_place_source public.place_source not null default 'manual',
  embark_external_place_id text,
  embark_latitude numeric(9, 6),
  embark_longitude numeric(9, 6),
  disembark_place_label text,
  disembark_place_source public.place_source not null default 'manual',
  disembark_external_place_id text,
  disembark_latitude numeric(9, 6),
  disembark_longitude numeric(9, 6),
  status public.visit_status not null default 'tentative',
  public_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint visits_date_check check (embark_date <= disembark_date),
  constraint visits_embark_latitude_check check (embark_latitude is null or embark_latitude between -90 and 90),
  constraint visits_embark_longitude_check check (embark_longitude is null or embark_longitude between -180 and 180),
  constraint visits_disembark_latitude_check check (disembark_latitude is null or disembark_latitude between -90 and 90),
  constraint visits_disembark_longitude_check check (disembark_longitude is null or disembark_longitude between -180 and 180)
);

create table public.visit_private_notes (
  visit_id uuid primary key references public.visits (id) on delete cascade,
  private_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index boats_is_active_idx on public.boats (is_active);
create index user_boat_permissions_boat_id_idx on public.user_boat_permissions (boat_id);
create index user_boat_permissions_user_id_idx on public.user_boat_permissions (user_id);
create index seasons_boat_id_idx on public.seasons (boat_id);
create index seasons_year_idx on public.seasons (year);
create index trip_segments_season_id_idx on public.trip_segments (season_id);
create index trip_segments_date_idx on public.trip_segments (start_date, end_date);
create index visits_season_id_idx on public.visits (season_id);
create index visits_owner_user_id_idx on public.visits (owner_user_id);
create index visits_status_idx on public.visits (status);
create index visits_confirmed_availability_idx on public.visits (season_id, embark_date, disembark_date)
  where status = 'confirmed';

create trigger set_boats_updated_at
before update on public.boats
for each row
execute function public.set_updated_at();

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_user_boat_permissions_updated_at
before update on public.user_boat_permissions
for each row
execute function public.set_updated_at();

create trigger set_seasons_updated_at
before update on public.seasons
for each row
execute function public.set_updated_at();

create trigger set_trip_segments_updated_at
before update on public.trip_segments
for each row
execute function public.set_updated_at();

create trigger set_trip_segment_private_notes_updated_at
before update on public.trip_segment_private_notes
for each row
execute function public.set_updated_at();

create trigger set_visits_updated_at
before update on public.visits
for each row
execute function public.set_updated_at();

create trigger set_visit_private_notes_updated_at
before update on public.visit_private_notes
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (id)
select users.id
from auth.users as users
on conflict (id) do nothing;

create or replace function public.current_user_is_superuser()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_superuser = true
  );
$$;

create or replace function public.has_boat_access(target_boat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_is_superuser()
    or exists (
      select 1
      from public.user_boat_permissions
      where user_id = auth.uid()
        and boat_id = target_boat_id
    );
$$;

create or replace function public.can_edit_boat(target_boat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_is_superuser()
    or exists (
      select 1
      from public.user_boat_permissions
      where user_id = auth.uid()
        and boat_id = target_boat_id
        and (
          can_edit = true
          or permission_level in ('editor', 'manager')
        )
    );
$$;

create or replace function public.can_manage_boat_users(target_boat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_is_superuser()
    or exists (
      select 1
      from public.user_boat_permissions
      where user_id = auth.uid()
        and boat_id = target_boat_id
        and (
          can_manage_boat_users = true
          or permission_level = 'manager'
        )
    );
$$;

create or replace function public.can_view_private_notes(target_boat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_is_superuser()
    or exists (
      select 1
      from public.user_boat_permissions
      where user_id = auth.uid()
        and boat_id = target_boat_id
        and (
          can_view_private_notes = true
          or can_edit = true
          or permission_level in ('editor', 'manager')
        )
    );
$$;

create or replace function public.can_view_all_visits(target_boat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_is_superuser()
    or exists (
      select 1
      from public.user_boat_permissions
      where user_id = auth.uid()
        and boat_id = target_boat_id
        and (
          can_view_all_visits = true
          or can_edit = true
          or permission_level in ('editor', 'manager')
        )
    );
$$;

create or replace function public.can_view_visit_names(target_boat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_is_superuser()
    or exists (
      select 1
      from public.user_boat_permissions
      where user_id = auth.uid()
        and boat_id = target_boat_id
        and (
          can_view_visit_names = true
          or can_view_all_visits = true
          or can_edit = true
          or permission_level in ('editor', 'manager')
        )
    );
$$;

create or replace function public.can_view_only_own_visit(target_boat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_is_superuser()
    or exists (
      select 1
      from public.user_boat_permissions
      where user_id = auth.uid()
        and boat_id = target_boat_id
        and can_view_only_own_visit = true
    );
$$;

create or replace function public.can_view_availability(target_boat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_is_superuser()
    or exists (
      select 1
      from public.user_boat_permissions
      where user_id = auth.uid()
        and boat_id = target_boat_id
        and (
          can_view_availability = true
          or can_view_all_visits = true
          or can_view_only_own_visit = true
          or can_edit = true
          or permission_level in ('editor', 'manager')
        )
    );
$$;

create or replace view public.boat_access_overview as
select
  b.id as boat_id,
  b.name as boat_name,
  ubp.permission_level,
  ubp.can_edit,
  ubp.can_manage_boat_users
from public.boats as b
left join public.user_boat_permissions as ubp
  on ubp.boat_id = b.id
 and ubp.user_id = auth.uid()
where public.current_user_is_superuser()
   or ubp.user_id is not null;

alter table public.boats enable row level security;
alter table public.profiles enable row level security;
alter table public.user_boat_permissions enable row level security;
alter table public.seasons enable row level security;
alter table public.trip_segments enable row level security;
alter table public.trip_segment_private_notes enable row level security;
alter table public.visits enable row level security;
alter table public.visit_private_notes enable row level security;

create policy "profiles_select_self_or_superuser"
on public.profiles
for select
using (
  id = auth.uid()
  or public.current_user_is_superuser()
);

create policy "profiles_update_self_or_superuser"
on public.profiles
for update
using (
  id = auth.uid()
  or public.current_user_is_superuser()
)
with check (
  id = auth.uid()
  or public.current_user_is_superuser()
);

create policy "boats_select_with_access"
on public.boats
for select
using (public.has_boat_access(id));

create policy "boats_insert_superuser_only"
on public.boats
for insert
with check (public.current_user_is_superuser());

create policy "boats_update_editors"
on public.boats
for update
using (public.can_edit_boat(id))
with check (public.can_edit_boat(id));

create policy "boats_delete_superuser_only"
on public.boats
for delete
using (public.current_user_is_superuser());

create policy "permissions_select_self_manager_or_superuser"
on public.user_boat_permissions
for select
using (
  user_id = auth.uid()
  or public.can_manage_boat_users(boat_id)
);

create policy "permissions_insert_manager_or_superuser"
on public.user_boat_permissions
for insert
with check (public.can_manage_boat_users(boat_id));

create policy "permissions_update_manager_or_superuser"
on public.user_boat_permissions
for update
using (public.can_manage_boat_users(boat_id))
with check (public.can_manage_boat_users(boat_id));

create policy "permissions_delete_manager_or_superuser"
on public.user_boat_permissions
for delete
using (public.can_manage_boat_users(boat_id));

create policy "seasons_select_with_boat_access"
on public.seasons
for select
using (public.has_boat_access(boat_id));

create policy "seasons_insert_editors"
on public.seasons
for insert
with check (public.can_edit_boat(boat_id));

create policy "seasons_update_editors"
on public.seasons
for update
using (public.can_edit_boat(boat_id))
with check (public.can_edit_boat(boat_id));

create policy "seasons_delete_editors"
on public.seasons
for delete
using (public.can_edit_boat(boat_id));

create policy "trip_segments_select_with_boat_access"
on public.trip_segments
for select
using (
  exists (
    select 1
    from public.seasons
    where seasons.id = trip_segments.season_id
      and public.has_boat_access(seasons.boat_id)
  )
);

create policy "trip_segments_insert_editors"
on public.trip_segments
for insert
with check (
  exists (
    select 1
    from public.seasons
    where seasons.id = trip_segments.season_id
      and public.can_edit_boat(seasons.boat_id)
  )
);

create policy "trip_segments_update_editors"
on public.trip_segments
for update
using (
  exists (
    select 1
    from public.seasons
    where seasons.id = trip_segments.season_id
      and public.can_edit_boat(seasons.boat_id)
  )
)
with check (
  exists (
    select 1
    from public.seasons
    where seasons.id = trip_segments.season_id
      and public.can_edit_boat(seasons.boat_id)
  )
);

create policy "trip_segments_delete_editors"
on public.trip_segments
for delete
using (
  exists (
    select 1
    from public.seasons
    where seasons.id = trip_segments.season_id
      and public.can_edit_boat(seasons.boat_id)
  )
);

create policy "trip_segment_private_notes_select_note_viewers"
on public.trip_segment_private_notes
for select
using (
  exists (
    select 1
    from public.trip_segments
    join public.seasons on seasons.id = trip_segments.season_id
    where trip_segments.id = trip_segment_private_notes.trip_segment_id
      and public.can_view_private_notes(seasons.boat_id)
  )
);

create policy "trip_segment_private_notes_insert_editors"
on public.trip_segment_private_notes
for insert
with check (
  exists (
    select 1
    from public.trip_segments
    join public.seasons on seasons.id = trip_segments.season_id
    where trip_segments.id = trip_segment_private_notes.trip_segment_id
      and public.can_edit_boat(seasons.boat_id)
  )
);

create policy "trip_segment_private_notes_update_editors"
on public.trip_segment_private_notes
for update
using (
  exists (
    select 1
    from public.trip_segments
    join public.seasons on seasons.id = trip_segments.season_id
    where trip_segments.id = trip_segment_private_notes.trip_segment_id
      and public.can_edit_boat(seasons.boat_id)
  )
)
with check (
  exists (
    select 1
    from public.trip_segments
    join public.seasons on seasons.id = trip_segments.season_id
    where trip_segments.id = trip_segment_private_notes.trip_segment_id
      and public.can_edit_boat(seasons.boat_id)
  )
);

create policy "trip_segment_private_notes_delete_editors"
on public.trip_segment_private_notes
for delete
using (
  exists (
    select 1
    from public.trip_segments
    join public.seasons on seasons.id = trip_segments.season_id
    where trip_segments.id = trip_segment_private_notes.trip_segment_id
      and public.can_edit_boat(seasons.boat_id)
  )
);

create policy "visits_select_full_or_own_scope"
on public.visits
for select
using (
  exists (
    select 1
    from public.seasons
    where seasons.id = visits.season_id
      and (
        public.can_view_all_visits(seasons.boat_id)
        or (
          visits.owner_user_id = auth.uid()
          and public.can_view_only_own_visit(seasons.boat_id)
        )
      )
  )
);

create policy "visits_insert_editors"
on public.visits
for insert
with check (
  exists (
    select 1
    from public.seasons
    where seasons.id = visits.season_id
      and public.can_edit_boat(seasons.boat_id)
  )
);

create policy "visits_update_editors"
on public.visits
for update
using (
  exists (
    select 1
    from public.seasons
    where seasons.id = visits.season_id
      and public.can_edit_boat(seasons.boat_id)
  )
)
with check (
  exists (
    select 1
    from public.seasons
    where seasons.id = visits.season_id
      and public.can_edit_boat(seasons.boat_id)
  )
);

create policy "visits_delete_editors"
on public.visits
for delete
using (
  exists (
    select 1
    from public.seasons
    where seasons.id = visits.season_id
      and public.can_edit_boat(seasons.boat_id)
  )
);

create policy "visit_private_notes_select_note_viewers"
on public.visit_private_notes
for select
using (
  exists (
    select 1
    from public.visits
    join public.seasons on seasons.id = visits.season_id
    where visits.id = visit_private_notes.visit_id
      and public.can_view_private_notes(seasons.boat_id)
  )
);

create policy "visit_private_notes_insert_editors"
on public.visit_private_notes
for insert
with check (
  exists (
    select 1
    from public.visits
    join public.seasons on seasons.id = visits.season_id
    where visits.id = visit_private_notes.visit_id
      and public.can_edit_boat(seasons.boat_id)
  )
);

create policy "visit_private_notes_update_editors"
on public.visit_private_notes
for update
using (
  exists (
    select 1
    from public.visits
    join public.seasons on seasons.id = visits.season_id
    where visits.id = visit_private_notes.visit_id
      and public.can_edit_boat(seasons.boat_id)
  )
)
with check (
  exists (
    select 1
    from public.visits
    join public.seasons on seasons.id = visits.season_id
    where visits.id = visit_private_notes.visit_id
      and public.can_edit_boat(seasons.boat_id)
  )
);

create policy "visit_private_notes_delete_editors"
on public.visit_private_notes
for delete
using (
  exists (
    select 1
    from public.visits
    join public.seasons on seasons.id = visits.season_id
    where visits.id = visit_private_notes.visit_id
      and public.can_edit_boat(seasons.boat_id)
  )
);

create or replace function public.get_season_trip_segments(p_season_id uuid)
returns table (
  id uuid,
  season_id uuid,
  start_date date,
  end_date date,
  location_label text,
  location_type public.location_type,
  place_source public.place_source,
  external_place_id text,
  latitude numeric,
  longitude numeric,
  status public.trip_segment_status,
  public_notes text,
  private_notes text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ts.id,
    ts.season_id,
    ts.start_date,
    ts.end_date,
    ts.location_label,
    ts.location_type,
    ts.place_source,
    ts.external_place_id,
    ts.latitude,
    ts.longitude,
    ts.status,
    ts.public_notes,
    case
      when public.can_view_private_notes(seasons.boat_id) then tspn.private_notes
      else null
    end as private_notes,
    ts.created_at,
    ts.updated_at
  from public.trip_segments as ts
  join public.seasons on seasons.id = ts.season_id
  left join public.trip_segment_private_notes as tspn
    on tspn.trip_segment_id = ts.id
  where ts.season_id = p_season_id
    and public.has_boat_access(seasons.boat_id);
$$;

create or replace function public.get_season_visits(p_season_id uuid)
returns table (
  id uuid,
  season_id uuid,
  owner_user_id uuid,
  visitor_name text,
  embark_date date,
  disembark_date date,
  embark_place_label text,
  disembark_place_label text,
  status public.visit_status,
  public_notes text,
  private_notes text,
  blocks_availability boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with scoped_season as (
    select boat_id
    from public.seasons
    where id = p_season_id
  )
  select
    v.id,
    v.season_id,
    v.owner_user_id,
    case
      when public.can_view_visit_names(scoped_season.boat_id)
        or (v.owner_user_id = auth.uid() and public.can_view_only_own_visit(scoped_season.boat_id))
      then v.visitor_name
      else null
    end as visitor_name,
    v.embark_date,
    v.disembark_date,
    v.embark_place_label,
    v.disembark_place_label,
    v.status,
    case
      when public.can_view_all_visits(scoped_season.boat_id)
        or (v.owner_user_id = auth.uid() and public.can_view_only_own_visit(scoped_season.boat_id))
      then v.public_notes
      else null
    end as public_notes,
    case
      when public.can_view_private_notes(scoped_season.boat_id)
      then vpn.private_notes
      else null
    end as private_notes,
    (v.status = 'confirmed') as blocks_availability,
    v.created_at,
    v.updated_at
  from public.visits as v
  join scoped_season on true
  left join public.visit_private_notes as vpn
    on vpn.visit_id = v.id
  where v.season_id = p_season_id
    and public.can_view_availability(scoped_season.boat_id)
    and (
      public.can_view_all_visits(scoped_season.boat_id)
      or v.owner_user_id = auth.uid()
      or public.can_view_availability(scoped_season.boat_id)
    );
$$;

grant usage on schema public to anon, authenticated;

grant select on public.boat_access_overview to authenticated;
grant execute on function public.get_season_trip_segments(uuid) to authenticated;
grant execute on function public.get_season_visits(uuid) to authenticated;

grant select, insert, update, delete on public.boats to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_boat_permissions to authenticated;
grant select, insert, update, delete on public.seasons to authenticated;
grant select, insert, update, delete on public.trip_segments to authenticated;
grant select, insert, update, delete on public.trip_segment_private_notes to authenticated;
grant select, insert, update, delete on public.visits to authenticated;
grant select, insert, update, delete on public.visit_private_notes to authenticated;
