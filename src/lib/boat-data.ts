/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  BoatSummary,
  BoatWorkspace,
  TripSegmentView,
  ViewerContext,
  VisitView,
} from "@/lib/planning";

type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];
type BoatRow = Database["public"]["Tables"]["boats"]["Row"];
type PermissionRow = Database["public"]["Tables"]["user_boat_permissions"]["Row"];
type BoatOverviewRow = Database["public"]["Views"]["boat_access_overview"]["Row"];

export const requireViewer = async () => {
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const viewer: ViewerContext = {
    profile,
    isSuperuser: Boolean(profile?.is_superuser),
  };

  return { supabase, user, viewer };
};

export const getAccessibleBoats = async () => {
  const { supabase, viewer } = await requireViewer();
  const db = supabase as any;

  const { data } = await db
    .from("boats")
    .select("id, name, description, is_active, model, year_built, home_port")
    .order("name");

  const { data: overviewData } = await db
    .from("boat_access_overview")
    .select("boat_id, boat_name, permission_level, can_edit, can_manage_boat_users")
    .order("boat_name");

  const overviewByBoat = new Map(
    ((overviewData ?? []) as BoatOverviewRow[]).map((row: BoatOverviewRow) => [
      row.boat_id,
      row,
    ]),
  );

  return ((data ?? []) as (BoatRow & {
    model?: string | null;
    year_built?: number | null;
    home_port?: string | null;
  })[]).map((boat) => ({
    boat_id: boat.id,
    boat_name: boat.name,
    permission_level:
      overviewByBoat.get(boat.id)?.permission_level ??
      (viewer.isSuperuser ? null : "viewer"),
    can_edit:
      overviewByBoat.get(boat.id)?.can_edit ?? Boolean(viewer.isSuperuser),
    can_manage_boat_users:
      overviewByBoat.get(boat.id)?.can_manage_boat_users ??
      Boolean(viewer.isSuperuser),
    description: boat.description,
    home_port: boat.home_port ?? null,
    model: boat.model ?? null,
    year_built: boat.year_built ?? null,
    is_active: boat.is_active,
  })) as BoatSummary[];
};

export const getBoatWorkspace = async (
  boatId: string,
  requestedSeasonId?: string,
) => {
  const { supabase, user, viewer } = await requireViewer();
  const db = supabase as any;
  const boats = await getAccessibleBoats();

  const boat = boats.find((entry) => entry.boat_id === boatId);
  if (!boat) {
    redirect("/dashboard");
  }

  const [{ data: boatRowData }, { data: permissionData }, { data: seasonsData }] =
    await Promise.all([
      db.from("boats").select("*").eq("id", boatId).maybeSingle(),
      db
        .from("user_boat_permissions")
        .select("*")
        .eq("boat_id", boatId)
        .eq("user_id", user.id)
        .maybeSingle(),
      db.from("seasons").select("*").eq("boat_id", boatId).order("year", {
        ascending: false,
      }),
    ]);

  const seasons = (seasonsData ?? []) as SeasonRow[];
  const selectedSeason =
    seasons.find((season) => season.id === requestedSeasonId) ?? seasons[0] ?? null;

  let tripSegments: TripSegmentView[] = [];
  let visits: VisitView[] = [];

  if (selectedSeason) {
    const [{ data: tripData }, { data: visitData }] = await Promise.all([
      db.rpc("get_season_trip_segments", {
        p_season_id: selectedSeason.id,
      }),
      db.rpc("get_season_visits", {
        p_season_id: selectedSeason.id,
      }),
    ]);

    tripSegments = (tripData ?? []) as TripSegmentView[];
    visits = (visitData ?? []) as VisitView[];
  }

  return {
    viewer,
    boat: boatRowData as unknown as BoatRow,
    permission: permissionData as PermissionRow | null,
    boats,
    seasons,
    selectedSeason,
    tripSegments,
    visits,
  } satisfies BoatWorkspace;
};
