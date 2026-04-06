do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'visit_panel_display_mode'
  ) then
    create type public.visit_panel_display_mode as enum ('text', 'image', 'both');
  end if;
end
$$;

alter table public.boats
  add column if not exists visit_panel_display_mode public.visit_panel_display_mode not null default 'both';

alter table public.visits
  add column if not exists badge_emoji text,
  add column if not exists image_path text;

insert into storage.buckets (id, name, public)
values ('visit-images', 'visit-images', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Boat editors can upload visit images" on storage.objects;
create policy "Boat editors can upload visit images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'visit-images'
  and public.can_edit_boat((storage.foldername(name))[1]::uuid)
);

drop policy if exists "Boat editors can update visit images" on storage.objects;
create policy "Boat editors can update visit images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'visit-images'
  and public.can_edit_boat((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'visit-images'
  and public.can_edit_boat((storage.foldername(name))[1]::uuid)
);

drop policy if exists "Boat editors can delete visit images" on storage.objects;
create policy "Boat editors can delete visit images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'visit-images'
  and public.can_edit_boat((storage.foldername(name))[1]::uuid)
);

drop function if exists public.get_season_visits(uuid);

create function public.get_season_visits(p_season_id uuid)
returns table (
  id uuid,
  season_id uuid,
  owner_user_id uuid,
  visitor_name text,
  badge_emoji text,
  image_path text,
  embark_date date,
  disembark_date date,
  embark_place_label text,
  embark_latitude numeric,
  embark_longitude numeric,
  disembark_place_label text,
  disembark_latitude numeric,
  disembark_longitude numeric,
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
    case
      when public.can_view_visit_names(scoped_season.boat_id)
        or (v.owner_user_id = auth.uid() and public.can_view_only_own_visit(scoped_season.boat_id))
      then v.badge_emoji
      else null
    end as badge_emoji,
    case
      when public.can_view_visit_names(scoped_season.boat_id)
        or (v.owner_user_id = auth.uid() and public.can_view_only_own_visit(scoped_season.boat_id))
      then v.image_path
      else null
    end as image_path,
    case
      when public.can_view_all_visits(scoped_season.boat_id)
        or (v.owner_user_id = auth.uid() and public.can_view_only_own_visit(scoped_season.boat_id))
      then v.embark_date
      else null
    end as embark_date,
    case
      when public.can_view_all_visits(scoped_season.boat_id)
        or (v.owner_user_id = auth.uid() and public.can_view_only_own_visit(scoped_season.boat_id))
      then v.disembark_date
      else null
    end as disembark_date,
    case
      when public.can_view_all_visits(scoped_season.boat_id)
        or (v.owner_user_id = auth.uid() and public.can_view_only_own_visit(scoped_season.boat_id))
      then v.embark_place_label
      else null
    end as embark_place_label,
    case
      when public.can_view_all_visits(scoped_season.boat_id)
        or (v.owner_user_id = auth.uid() and public.can_view_only_own_visit(scoped_season.boat_id))
      then v.embark_latitude
      else null
    end as embark_latitude,
    case
      when public.can_view_all_visits(scoped_season.boat_id)
        or (v.owner_user_id = auth.uid() and public.can_view_only_own_visit(scoped_season.boat_id))
      then v.embark_longitude
      else null
    end as embark_longitude,
    case
      when public.can_view_all_visits(scoped_season.boat_id)
        or (v.owner_user_id = auth.uid() and public.can_view_only_own_visit(scoped_season.boat_id))
      then v.disembark_place_label
      else null
    end as disembark_place_label,
    case
      when public.can_view_all_visits(scoped_season.boat_id)
        or (v.owner_user_id = auth.uid() and public.can_view_only_own_visit(scoped_season.boat_id))
      then v.disembark_latitude
      else null
    end as disembark_latitude,
    case
      when public.can_view_all_visits(scoped_season.boat_id)
        or (v.owner_user_id = auth.uid() and public.can_view_only_own_visit(scoped_season.boat_id))
      then v.disembark_longitude
      else null
    end as disembark_longitude,
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
    and (
      public.can_view_all_visits(scoped_season.boat_id)
      or (
        v.owner_user_id = auth.uid()
        and public.can_view_only_own_visit(scoped_season.boat_id)
      )
      or public.can_view_availability(scoped_season.boat_id)
    );
$$;

grant execute on function public.get_season_visits(uuid) to authenticated;
