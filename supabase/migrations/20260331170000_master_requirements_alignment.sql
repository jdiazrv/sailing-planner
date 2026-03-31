alter table public.boats
  add column if not exists model text,
  add column if not exists year_built integer,
  add column if not exists home_port text,
  add column if not exists notes text;

alter type public.location_type add value if not exists 'zone';
alter type public.location_type add value if not exists 'island';
alter type public.location_type add value if not exists 'city';
alter type public.location_type add value if not exists 'airport';

alter type public.trip_segment_status add value if not exists 'tentative';
alter type public.trip_segment_status add value if not exists 'confirmed';
