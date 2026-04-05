do $$
declare
  demo_boat_id uuid := gen_random_uuid();
  demo_season_id uuid := gen_random_uuid();
  first_user_id uuid;
  segment_one_id uuid := gen_random_uuid();
  segment_two_id uuid := gen_random_uuid();
  tentative_visit_id uuid := gen_random_uuid();
  confirmed_visit_id uuid := gen_random_uuid();
begin
  select id
  into first_user_id
  from auth.users
  order by created_at
  limit 1;

  insert into public.boats (id, name, description)
  values (
    demo_boat_id,
    'Demo Sailing Planner Boat',
    'Minimal seed boat used to validate the multi-boat planning schema.'
  )
  on conflict do nothing;

  insert into public.seasons (id, boat_id, year, start_date, end_date, name, notes)
  values (
    demo_season_id,
    demo_boat_id,
    2026,
    date '2026-05-01',
    date '2026-10-31',
    '2026 Mediterranean Season',
    'Seed season for local validation.'
  )
  on conflict do nothing;

  insert into public.port_stops (
    id,
    season_id,
    start_date,
    end_date,
    location_label,
    location_type,
    place_source,
    status,
    public_notes
  )
  values
    (
      segment_one_id,
      demo_season_id,
      date '2026-05-12',
      date '2026-05-18',
      'Palma de Mallorca',
      'marina',
      'manual',
      'planned',
      'Provisioning and departure window.'
    ),
    (
      segment_two_id,
      demo_season_id,
      date '2026-05-19',
      date '2026-05-25',
      'Cabrera Anchorage',
      'anchorage',
      'manual',
      'planned',
      'Short anchorage leg for availability testing.'
    )
  on conflict do nothing;

  insert into public.port_stop_private_notes (port_stop_id, private_notes)
  values
    (segment_one_id, 'Owner-only prep notes for the marina leg.'),
    (segment_two_id, 'Protected anchorage-specific logistics.')
  on conflict do nothing;

  insert into public.visits (
    id,
    season_id,
    owner_user_id,
    visitor_name,
    embark_date,
    disembark_date,
    embark_place_label,
    disembark_place_label,
    status,
    public_notes
  )
  values
    (
      tentative_visit_id,
      demo_season_id,
      first_user_id,
      'Tentative Crew',
      date '2026-06-02',
      date '2026-06-06',
      'Palma',
      'Ibiza',
      'tentative',
      'Tentative visit should not block availability.'
    ),
    (
      confirmed_visit_id,
      demo_season_id,
      first_user_id,
      'Confirmed Guests',
      date '2026-06-10',
      date '2026-06-14',
      'Ibiza',
      'Mahon',
      'confirmed',
      'Confirmed visit blocks availability.'
    )
  on conflict do nothing;

  insert into public.visit_private_notes (visit_id, private_notes)
  values
    (tentative_visit_id, 'Private note for tentative visit.'),
    (confirmed_visit_id, 'Private note for confirmed visit.')
  on conflict do nothing;

  if first_user_id is not null then
    insert into public.user_boat_permissions (
      user_id,
      boat_id,
      permission_level,
      can_edit,
      can_view_all_visits,
      can_view_visit_names,
      can_view_private_notes,
      can_manage_boat_users,
      can_view_availability
    )
    values (
      first_user_id,
      demo_boat_id,
      'manager',
      true,
      true,
      true,
      true,
      true,
      true
    )
    on conflict (user_id, boat_id) do nothing;
  else
    raise notice 'Seed created boat/season data but no auth.users record exists yet, so no demo permission row was inserted.';
  end if;
end
$$;
