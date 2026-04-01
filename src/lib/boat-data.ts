/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  BoatDetails,
  BoatSummary,
  BoatWorkspace,
  SharedTimelineBoat,
  TripSegmentView,
  UserAdminProfile,
  ViewerContext,
  VisitView,
} from "@/lib/planning";

type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];
type BoatRow = Database["public"]["Tables"]["boats"]["Row"];
type PermissionRow = Database["public"]["Tables"]["user_boat_permissions"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type BoatOverviewRow = Database["public"]["Views"]["boat_access_overview"]["Row"];

const getBoatImageUrl = (
  supabase: Awaited<ReturnType<typeof createClient>>,
  imagePath: string | null | undefined,
  updatedAt?: string | null,
) => {
  if (!imagePath) {
    return null;
  }

  const { data } = supabase.storage.from("boat-images").getPublicUrl(imagePath);
  return updatedAt
    ? `${data.publicUrl}?v=${encodeURIComponent(updatedAt)}`
    : data.publicUrl;
};

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
    .select(
      "id, name, description, is_active, model, year_built, home_port, image_path",
    )
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
    image_path: boat.image_path ?? null,
    image_url: getBoatImageUrl(supabase, boat.image_path, boat.updated_at),
    model: boat.model ?? null,
    year_built: boat.year_built ?? null,
    is_active: boat.is_active,
  })) as BoatSummary[];
};

export const requireSuperuser = async () => {
  const context = await requireViewer();

  if (!context.viewer.isSuperuser) {
    redirect("/dashboard");
  }

  return context;
};

export const requireUserAdminAccess = async () => {
  const context = await requireViewer();
  const db = context.supabase as any;

  if (context.viewer.isSuperuser) {
    return {
      ...context,
      manageableBoatIds: null as string[] | null,
    };
  }

  const { data, error } = await db
    .from("user_boat_permissions")
    .select("boat_id")
    .eq("user_id", context.user.id)
    .eq("can_manage_boat_users", true);

  if (error) {
    throw new Error(error.message);
  }

  const manageableBoatIds = ((data ?? []) as { boat_id: string }[]).map(
    (entry) => entry.boat_id,
  );

  if (!manageableBoatIds.length) {
    redirect("/dashboard");
  }

  return {
    ...context,
    manageableBoatIds,
  };
};

export const getAdminBoats = async () => {
  const { supabase, manageableBoatIds } = await requireUserAdminAccess();
  const db = supabase as any;
  let query = db.from("boats").select("*").order("name");
  if (manageableBoatIds) {
    query = query.in("id", manageableBoatIds);
  }
  const { data } = await query;

  return ((data ?? []) as BoatRow[]).map((boat) => ({
    ...boat,
    image_url: getBoatImageUrl(supabase, boat.image_path, boat.updated_at),
  })) as BoatDetails[];
};

export const getAdminUsers = async () => {
  const { supabase, manageableBoatIds, viewer } = await requireUserAdminAccess();
  const db = supabase as any;

  let permissionsQuery = db
    .from("user_boat_permissions")
    .select("*")
    .order("boat_id")
    .order("user_id");

  if (manageableBoatIds) {
    permissionsQuery = permissionsQuery.in("boat_id", manageableBoatIds);
  }

  const [{ data: permissionsData }, { data: profilesData }] = await Promise.all([
    permissionsQuery,
    viewer.isSuperuser
      ? db.from("profiles").select("*").order("display_name")
      : db.from("profiles").select("*").order("display_name"),
  ]);

  const permissions = (permissionsData ?? []) as PermissionRow[];
  const permissionsByUser = new Map<string, PermissionRow[]>();

  permissions.forEach((permission) => {
    const existing = permissionsByUser.get(permission.user_id) ?? [];
    existing.push(permission);
    permissionsByUser.set(permission.user_id, existing);
  });

  const visibleUserIds = new Set<string>();
  permissions.forEach((permission) => visibleUserIds.add(permission.user_id));
  visibleUserIds.add(viewer.profile?.id ?? "");

  const profiles = ((profilesData ?? []) as ProfileRow[]).filter((profile) =>
    viewer.isSuperuser ? true : visibleUserIds.has(profile.id),
  );

  return profiles.map((profile) => ({
    ...profile,
    permissions: permissionsByUser.get(profile.id) ?? [],
  })) as UserAdminProfile[];
};

export const getSharedTimelineWorkspace = async (
  requestedBoatId?: string,
  requestedSeasonId?: string,
) => {
  const { supabase, user, viewer } = await requireViewer();
  const db = supabase as any;
  const viewerIsPublic = Boolean(viewer.profile?.is_timeline_public);

  if (!viewer.isSuperuser && !viewerIsPublic) {
    return {
      viewer,
      boats: [] as SharedTimelineBoat[],
      selectedBoat: null as SharedTimelineBoat | null,
      selectedBoatId: null as string | null,
      seasons: [] as SeasonRow[],
      selectedSeason: null as SeasonRow | null,
    };
  }

  const { data: profilesData, error: profilesError } = await db
    .from("profiles")
    .select("id, display_name, is_timeline_public")
    .eq("is_timeline_public", true)
    .neq("id", user.id);
  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const publicProfiles = (profilesData ?? []) as Pick<
    ProfileRow,
    "id" | "display_name" | "is_timeline_public"
  >[];
  const publicUserIds = publicProfiles.map((profile) => profile.id);

  if (!publicUserIds.length) {
    return {
      viewer,
      boats: [] as SharedTimelineBoat[],
      selectedBoat: null as SharedTimelineBoat | null,
      selectedBoatId: null as string | null,
      seasons: [] as SeasonRow[],
      selectedSeason: null as SeasonRow | null,
    };
  }

  const { data: permissionsData, error: permissionsError } = await db
    .from("user_boat_permissions")
    .select("boat_id, user_id")
    .in("user_id", publicUserIds);
  if (permissionsError) {
    throw new Error(permissionsError.message);
  }

  const uniqueBoatEntries = new Map<string, string>();
  ((permissionsData ?? []) as { boat_id: string; user_id: string }[]).forEach((entry) => {
    if (!uniqueBoatEntries.has(entry.boat_id)) {
      uniqueBoatEntries.set(entry.boat_id, entry.user_id);
    }
  });

  const sharedBoatIds = [...uniqueBoatEntries.keys()];

  if (!sharedBoatIds.length) {
    return {
      viewer,
      boats: [] as SharedTimelineBoat[],
      selectedBoat: null as SharedTimelineBoat | null,
      selectedBoatId: null as string | null,
      seasons: [] as SeasonRow[],
      selectedSeason: null as SeasonRow | null,
    };
  }

  const [{ data: boatsData, error: boatsError }, { data: seasonsData, error: seasonsError }] =
    await Promise.all([
      db.from("boats").select("*").in("id", sharedBoatIds).order("name"),
      db.from("seasons").select("*").in("boat_id", sharedBoatIds).order("year", {
        ascending: false,
      }),
    ]);

  if (boatsError) {
    throw new Error(boatsError.message);
  }
  if (seasonsError) {
    throw new Error(seasonsError.message);
  }

  const seasonsByBoat = new Map<string, SeasonRow[]>();
  ((seasonsData ?? []) as SeasonRow[]).forEach((season) => {
    const existing = seasonsByBoat.get(season.boat_id) ?? [];
    existing.push(season);
    seasonsByBoat.set(season.boat_id, existing);
  });

  const publicProfileById = new Map(
    publicProfiles.map((profile) => [profile.id, profile.display_name ?? null]),
  );

  const sharedBoats = ((boatsData ?? []) as BoatRow[]).map((boat) => {
    const ownerUserId = uniqueBoatEntries.get(boat.id) ?? null;
    const seasons = seasonsByBoat.get(boat.id) ?? [];
    const season = seasons.find((entry) => entry.id === requestedSeasonId) ?? seasons[0] ?? null;

    return {
      boat: {
        ...boat,
        image_url: getBoatImageUrl(supabase, boat.image_path, boat.updated_at),
      },
      season,
      ownerDisplayName: ownerUserId ? publicProfileById.get(ownerUserId) ?? null : null,
      tripSegments: [] as TripSegmentView[],
    } satisfies SharedTimelineBoat;
  });

  const selectedBoat =
    sharedBoats.find((entry) => entry.boat.id === requestedBoatId) ?? sharedBoats[0] ?? null;

  if (selectedBoat?.season) {
    const { data: tripData, error: tripError } = await db.rpc("get_season_trip_segments", {
      p_season_id: selectedBoat.season.id,
    });

    if (tripError) {
      throw new Error(tripError.message);
    }

    selectedBoat.tripSegments = (tripData ?? []) as TripSegmentView[];
  }

  return {
    viewer,
    boats: sharedBoats,
    selectedBoat,
    selectedBoatId: selectedBoat?.boat.id ?? null,
    seasons: selectedBoat ? seasonsByBoat.get(selectedBoat.boat.id) ?? [] : [],
    selectedSeason: selectedBoat?.season ?? null,
  };
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
    boat: {
      ...(boatRowData as BoatRow),
      image_url: getBoatImageUrl(
        supabase,
        (boatRowData as BoatRow | null)?.image_path,
        (boatRowData as BoatRow | null)?.updated_at,
      ),
    } as BoatDetails,
    permission: permissionData as PermissionRow | null,
    boats,
    seasons,
    selectedSeason,
    tripSegments,
    visits,
  } satisfies BoatWorkspace;
};
