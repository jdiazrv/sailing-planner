-- Rename trip_segments table and related objects to port_stops terminology
-- Idempotent version: handles partial migrations gracefully

-- Rename type (if not already renamed)
do $$
begin
  alter type public.trip_segment_status rename to port_stop_status;
exception when duplicate_object then null;
end $$;

-- Rename tables (if not already renamed)
do $$
begin
  alter table public.trip_segment_private_notes rename to port_stop_private_notes;
exception when undefined_table then null;
end $$;

do $$
begin
  alter table public.trip_segments rename to port_stops;
exception when undefined_table then null;
end $$;

-- Rename constraints in renamed table (safely handle already-renamed constraints)
do $$
begin
  alter table public.port_stops rename constraint trip_segments_boat_id_fkey to port_stops_boat_id_fkey;
exception when undefined_object then null;
end $$;

do $$
begin
  alter table public.port_stops rename constraint trip_segments_season_id_fkey to port_stops_season_id_fkey;
exception when undefined_object then null;
end $$;

-- Rename constraint in port_stop_private_notes (safely handle already-renamed constraint)
do $$
begin
  alter table public.port_stop_private_notes rename constraint trip_segment_private_notes_trip_segment_id_fkey to port_stop_private_notes_port_stop_id_fkey;
exception when undefined_object then null;
end $$;

-- Rename column in port_stop_private_notes (if not already renamed)
do $$
begin
  alter table public.port_stop_private_notes rename column trip_segment_id to port_stop_id;
exception when undefined_column then null;
end $$;

-- Rename function
drop function if exists public.get_season_trip_segments(uuid);

create function public.get_season_port_stops(p_season_id uuid)
returns table (
  id uuid,
  season_id uuid,
  sort_order integer,
  start_date date,
  end_date date,
  location_label text,
  location_type public.location_type,
  place_source public.place_source,
  external_place_id text,
  latitude numeric,
  longitude numeric,
  status public.port_stop_status,
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
    ps.id,
    ps.season_id,
    ps.sort_order,
    ps.start_date,
    ps.end_date,
    ps.location_label,
    ps.location_type,
    ps.place_source,
    ps.external_place_id,
    ps.latitude,
    ps.longitude,
    ps.status,
    ps.public_notes,
    case
      when public.can_view_private_notes(seasons.boat_id) then pspn.private_notes
      else null
    end as private_notes,
    ps.created_at,
    ps.updated_at
  from public.port_stops as ps
  join public.seasons on seasons.id = ps.season_id
  left join public.port_stop_private_notes as pspn
    on pspn.port_stop_id = ps.id
  where ps.season_id = p_season_id
    and public.has_boat_access(seasons.boat_id)
  order by ps.sort_order, ps.start_date, ps.end_date, ps.created_at, ps.id;
$$;

grant execute on function public.get_season_port_stops(uuid) to authenticated;
