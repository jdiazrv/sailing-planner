drop function if exists public.get_season_visits(uuid);

create function public.get_season_visits(p_season_id uuid)
returns table (
  id uuid,
  season_id uuid,
  owner_user_id uuid,
  visitor_name text,
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
    v.embark_date,
    v.disembark_date,
    v.embark_place_label,
    v.embark_latitude,
    v.embark_longitude,
    v.disembark_place_label,
    v.disembark_latitude,
    v.disembark_longitude,
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

grant execute on function public.get_season_visits(uuid) to authenticated;
