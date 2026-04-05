-- Rename trip_segments table and related objects to port_stops terminology

-- Rename type
alter type public.trip_segment_status rename to port_stop_status;

-- Rename tables
alter table public.trip_segment_private_notes rename to port_stop_private_notes;
alter table public.trip_segments rename to port_stops;

-- Rename constraints and columns in renamed table
alter table public.port_stops rename constraint trip_segments_boat_id_fkey to port_stops_boat_id_fkey;
alter table public.port_stops rename constraint trip_segments_season_id_fkey to port_stops_season_id_fkey;

-- Rename constraint in port_stop_private_notes
alter table public.port_stop_private_notes rename constraint trip_segment_private_notes_trip_segment_id_fkey to port_stop_private_notes_port_stop_id_fkey;
alter table public.port_stop_private_notes rename column trip_segment_id to port_stop_id;

-- Rename function
drop function if exists public.get_season_trip_segments(uuid);

create function public.get_season_port_stops(p_season_id uuid)
  returns table (
    id uuid,
    season_id uuid,
    sequence_number integer,
    place_text text,
    latitude numeric,
    longitude numeric,
    precision text,
    start_date date,
    end_date date,
    status public.port_stop_status,
    status_is_private boolean,
    public_notes text,
    private_notes text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    sort_order integer
  )
  language sql
  stable
as $$
  select
    ps.id,
    ps.season_id,
    ps.sequence_number,
    ps.place_text,
    ps.latitude,
    ps.longitude,
    ps.precision,
    ps.start_date,
    ps.end_date,
    ps.status,
    ps.status_is_private,
    ps.public_notes,
    pspn.private_notes,
    ps.created_at,
    ps.updated_at,
    ps.sort_order
  from public.port_stops as ps
  left join public.port_stop_private_notes as pspn
    on pspn.port_stop_id = ps.id
  where ps.season_id = p_season_id
  order by ps.sort_order asc, ps.created_at asc;
$$;

grant execute on function public.get_season_port_stops(uuid) to authenticated;
