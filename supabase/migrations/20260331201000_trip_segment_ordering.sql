alter table public.trip_segments
  add column if not exists sort_order integer not null default 0;

with ranked as (
  select
    id,
    row_number() over (
      partition by season_id
      order by start_date, end_date, created_at, id
    ) * 10 as next_order
  from public.trip_segments
)
update public.trip_segments as trip_segments
set sort_order = ranked.next_order
from ranked
where ranked.id = trip_segments.id
  and trip_segments.sort_order = 0;

drop function if exists public.get_season_trip_segments(uuid);

create function public.get_season_trip_segments(p_season_id uuid)
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
    ts.sort_order,
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
    and public.has_boat_access(seasons.boat_id)
  order by ts.sort_order, ts.start_date, ts.end_date, ts.created_at, ts.id;
$$;

grant execute on function public.get_season_trip_segments(uuid) to authenticated;
