/* eslint-disable @typescript-eslint/no-explicit-any */
import { cache } from "react";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireSeasonGuestSession } from "@/lib/season-access-server";
import type { Database } from "@/types/database";
import type {
  BoatDetails,
  BoatSummary,
  BoatWorkspace,
  SeasonAccessLinkSummary,
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
type SeasonAccessLinkRow =
  Database["public"]["Tables"]["season_access_links"]["Row"];

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

const getAccessibleBoatBase = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  viewer: ViewerContext,
) => {
  const db = supabase as any;
  const [{ data }, { data: overviewData }] = await Promise.all([
    db
      .from("boats")
      .select(
        "id, name, description, is_active, model, year_built, home_port, image_path, updated_at",
      )
      .order("name"),
    db
      .from("boat_access_overview")
      .select("boat_id, boat_name, permission_level, can_edit, can_manage_boat_users")
      .order("boat_name"),
  ]);

  const overviewByBoat = new Map(
    ((overviewData ?? []) as BoatOverviewRow[]).map((row: BoatOverviewRow) => [
      row.boat_id,
      row,
    ]),
  );

  const boatRows = (data ?? []) as (BoatRow & {
    model?: string | null;
    year_built?: number | null;
    home_port?: string | null;
  })[];

  return boatRows.map((boat) => ({
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

export const requireViewer = cache(async () => {
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
    onboardingPending: Boolean(profile?.onboarding_pending),
    isSeasonGuest: false,
  };

  return { supabase, user, viewer };
});

export const getAccessibleBoatsLite = cache(async () => {
  const { supabase, viewer } = await requireViewer();
  return getAccessibleBoatBase(supabase, viewer);
});

export const getAccessibleBoats = cache(async () => {
  const { supabase, viewer } = await requireViewer();
  const db = supabase as any;
  const baseBoats = await getAccessibleBoatBase(supabase, viewer);
  const boatIds = baseBoats.map((boat) => boat.boat_id);

  const tripSegmentsCountByBoat = new Map<string, number>();
  const visitsCountByBoat = new Map<string, number>();
  const activeInvitesCountByBoat = new Map<string, number>();
  const userLastAccessByBoat = new Map<string, { lastAccessAt: string | null; displayName: string | null }>();

  if (boatIds.length) {
    const [{ data: seasonsData }, { data: linksData }, { data: permissionsData }] = await Promise.all([
      db.from("seasons").select("id, boat_id").in("boat_id", boatIds),
      db
        .from("season_access_links")
        .select("boat_id, revoked_at, expires_at, single_use, redeemed_at")
        .in("boat_id", boatIds),
      db
        .from("user_boat_permissions")
        .select("boat_id, user_id, created_at")
        .in("boat_id", boatIds)
        .order("created_at", { ascending: true }),
    ]);

    const permissionRows = (permissionsData ?? []) as Pick<
      PermissionRow,
      "boat_id" | "user_id" | "created_at"
    >[];
    const userIds = [...new Set(permissionRows.map((permission) => permission.user_id))];
    const { data: profilesData } = userIds.length
      ? await db
          .from("profiles")
          .select("id, display_name, is_superuser, last_sign_in_at")
          .in("id", userIds)
      : { data: [] };

    const seasonRows = (seasonsData ?? []) as Pick<SeasonRow, "id" | "boat_id">[];
    const seasonById = new Map(seasonRows.map((season) => [season.id, season.boat_id]));
    const seasonIds = seasonRows.map((season) => season.id);

    if (seasonIds.length) {
      const [{ data: tripRows }, { data: visitRows }] = await Promise.all([
        db.from("trip_segments").select("season_id").in("season_id", seasonIds),
        db.from("visits").select("season_id").in("season_id", seasonIds),
      ]);

      ((tripRows ?? []) as Pick<Database["public"]["Tables"]["trip_segments"]["Row"], "season_id">[])
        .forEach((row) => {
          const boatId = seasonById.get(row.season_id);
          if (!boatId) return;
          tripSegmentsCountByBoat.set(boatId, (tripSegmentsCountByBoat.get(boatId) ?? 0) + 1);
        });

      ((visitRows ?? []) as Pick<Database["public"]["Tables"]["visits"]["Row"], "season_id">[])
        .forEach((row) => {
          const boatId = seasonById.get(row.season_id);
          if (!boatId) return;
          visitsCountByBoat.set(boatId, (visitsCountByBoat.get(boatId) ?? 0) + 1);
        });
    }

    const now = Date.now();
    (
      (linksData ?? []) as Pick<
        SeasonAccessLinkRow,
        "boat_id" | "revoked_at" | "expires_at" | "single_use" | "redeemed_at"
      >[]
    ).forEach((row) => {
      const isActive =
        !row.revoked_at &&
        new Date(row.expires_at).getTime() > now &&
        !(row.single_use && row.redeemed_at);

      if (!isActive) return;
      activeInvitesCountByBoat.set(
        row.boat_id,
        (activeInvitesCountByBoat.get(row.boat_id) ?? 0) + 1,
      );
    });

    const profileById = new Map(
      (
        (profilesData ?? []) as Pick<
          ProfileRow,
          "id" | "display_name" | "is_superuser" | "last_sign_in_at"
        >[]
      ).map((profile) => [profile.id, profile]),
    );

    permissionRows.forEach((permission) => {
        if (userLastAccessByBoat.has(permission.boat_id)) {
          return;
        }

        const profile = profileById.get(permission.user_id);
        if (!profile || profile.is_superuser) {
          return;
        }

        userLastAccessByBoat.set(permission.boat_id, {
          lastAccessAt: profile.last_sign_in_at ?? null,
          displayName: profile.display_name ?? null,
        });
      });
  }

  return baseBoats.map((boat) => ({
    ...boat,
    trip_segments_count: tripSegmentsCountByBoat.get(boat.boat_id) ?? 0,
    visits_count: visitsCountByBoat.get(boat.boat_id) ?? 0,
    active_invites_count: activeInvitesCountByBoat.get(boat.boat_id) ?? 0,
    user_last_access_at: userLastAccessByBoat.get(boat.boat_id)?.lastAccessAt ?? null,
    user_display_name: userLastAccessByBoat.get(boat.boat_id)?.displayName ?? null,
  })) as BoatSummary[];
});

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

export const requireBoatShareAccess = async (boatId: string) => {
  const context = await requireViewer();

  if (context.viewer.isSuperuser) {
    return context;
  }

  const db = context.supabase as any;
  const { data, error } = await db
    .from("user_boat_permissions")
    .select("boat_id, can_edit, can_manage_boat_users")
    .eq("boat_id", boatId)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.can_edit && !data?.can_manage_boat_users) {
    redirect(`/boats/${boatId}/trip`);
  }

  return context;
};

export const getAdminBoats = async () => {
  const { supabase, manageableBoatIds } = await requireUserAdminAccess();
  const db = supabase as any;
  let query = db.from("boats").select("*").order("name");
  if (manageableBoatIds) {
    query = query.in("id", manageableBoatIds);
  }
  const { data } = await query;
  const boatRows = (data ?? []) as BoatRow[];
  const boatIds = boatRows.map((boat) => boat.id);

  const tripSegmentsCountByBoat = new Map<string, number>();
  const visitsCountByBoat = new Map<string, number>();
  const activeInvitesCountByBoat = new Map<string, number>();
  const userLastAccessByBoat = new Map<
    string,
    { lastAccessAt: string | null; displayName: string | null }
  >();
  const usersCountByBoat = new Map<string, number>();

  if (boatIds.length) {
    const [{ data: seasonsData }, { data: linksData }, { data: permissionsData }] =
      await Promise.all([
        db.from("seasons").select("id, boat_id").in("boat_id", boatIds),
        db
          .from("season_access_links")
          .select("boat_id, revoked_at, expires_at, single_use, redeemed_at")
          .in("boat_id", boatIds),
        db
          .from("user_boat_permissions")
          .select("boat_id, user_id, created_at")
          .in("boat_id", boatIds)
          .order("created_at", { ascending: true }),
      ]);

    const permissionRows = (permissionsData ?? []) as Pick<
      PermissionRow,
      "boat_id" | "user_id" | "created_at"
    >[];
    const userIds = [...new Set(permissionRows.map((permission) => permission.user_id))];
    const { data: profilesData } = userIds.length
      ? await db
          .from("profiles")
          .select("id, display_name, is_superuser, last_sign_in_at")
          .in("id", userIds)
      : { data: [] };

    const seasonRows = (seasonsData ?? []) as Pick<SeasonRow, "id" | "boat_id">[];
    const seasonById = new Map(seasonRows.map((season) => [season.id, season.boat_id]));
    const seasonIds = seasonRows.map((season) => season.id);

    if (seasonIds.length) {
      const [{ data: tripRows }, { data: visitRows }] = await Promise.all([
        db.from("trip_segments").select("season_id").in("season_id", seasonIds),
        db.from("visits").select("season_id").in("season_id", seasonIds),
      ]);

      ((tripRows ?? []) as Pick<Database["public"]["Tables"]["trip_segments"]["Row"], "season_id">[])
        .forEach((row) => {
          const boatId = seasonById.get(row.season_id);
          if (!boatId) return;
          tripSegmentsCountByBoat.set(boatId, (tripSegmentsCountByBoat.get(boatId) ?? 0) + 1);
        });

      ((visitRows ?? []) as Pick<Database["public"]["Tables"]["visits"]["Row"], "season_id">[])
        .forEach((row) => {
          const boatId = seasonById.get(row.season_id);
          if (!boatId) return;
          visitsCountByBoat.set(boatId, (visitsCountByBoat.get(boatId) ?? 0) + 1);
        });
    }

    const now = Date.now();
    (
      (linksData ?? []) as Pick<
        SeasonAccessLinkRow,
        "boat_id" | "revoked_at" | "expires_at" | "single_use" | "redeemed_at"
      >[]
    ).forEach((row) => {
      const isActive =
        !row.revoked_at &&
        new Date(row.expires_at).getTime() > now &&
        !(row.single_use && row.redeemed_at);

      if (!isActive) return;
      activeInvitesCountByBoat.set(
        row.boat_id,
        (activeInvitesCountByBoat.get(row.boat_id) ?? 0) + 1,
      );
    });

    const profileById = new Map(
      (
        (profilesData ?? []) as Pick<
          ProfileRow,
          "id" | "display_name" | "is_superuser" | "last_sign_in_at"
        >[]
      ).map((profile) => [profile.id, profile]),
    );

    const usersByBoat = new Map<string, Set<string>>();

    permissionRows.forEach((permission) => {
      const users = usersByBoat.get(permission.boat_id) ?? new Set<string>();
      users.add(permission.user_id);
      usersByBoat.set(permission.boat_id, users);

      if (userLastAccessByBoat.has(permission.boat_id)) {
        return;
      }

      const profile = profileById.get(permission.user_id);
      if (!profile || profile.is_superuser) {
        return;
      }

      userLastAccessByBoat.set(permission.boat_id, {
        lastAccessAt: profile.last_sign_in_at ?? null,
        displayName: profile.display_name ?? null,
      });
    });

    usersByBoat.forEach((users, boatId) => {
      usersCountByBoat.set(boatId, users.size);
    });
  }

  return boatRows.map((boat) => ({
    ...boat,
    image_url: getBoatImageUrl(supabase, boat.image_path, boat.updated_at),
    trip_segments_count: tripSegmentsCountByBoat.get(boat.id) ?? 0,
    visits_count: visitsCountByBoat.get(boat.id) ?? 0,
    active_invites_count: activeInvitesCountByBoat.get(boat.id) ?? 0,
    user_last_access_at: userLastAccessByBoat.get(boat.id)?.lastAccessAt ?? null,
    user_display_name: userLastAccessByBoat.get(boat.id)?.displayName ?? null,
    users_count: usersCountByBoat.get(boat.id) ?? 0,
  })) as BoatDetails[];
};

export const getAdminUsers = async () => {
  const { supabase, manageableBoatIds, viewer } = await requireUserAdminAccess();
  const admin = createAdminClient();
  const db = supabase as any;

  let permissionsQuery = db
    .from("user_boat_permissions")
    .select("*")
    .order("boat_id")
    .order("user_id");

  if (manageableBoatIds) {
    permissionsQuery = permissionsQuery.in("boat_id", manageableBoatIds);
  }

  const { data: permissionsData, error: permissionsError } = await permissionsQuery;
  if (permissionsError) {
    throw new Error(permissionsError.message);
  }

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

  let profiles: ProfileRow[] = [];

  if (viewer.isSuperuser) {
    const profileClient = (admin ?? db) as any;
    const { data: profilesData, error: profilesError } = await profileClient
      .from("profiles")
      .select("*")
      .order("display_name");

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    profiles = (profilesData ?? []) as ProfileRow[];
  } else if (visibleUserIds.size) {
    const profileIds = [...visibleUserIds].filter(Boolean);
    const profileClient = (admin ?? db) as any;
    const { data: profilesData, error: profilesError } = await profileClient
      .from("profiles")
      .select("*")
      .in("id", profileIds)
      .order("display_name");

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    profiles = (profilesData ?? []) as ProfileRow[];
  }

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

  if (viewer.isSuperuser) {
    const [
      { data: boatsData, error: boatsError },
      { data: seasonsData, error: seasonsError },
      { data: permissionsData, error: permissionsError },
      { data: profilesData, error: profilesError },
    ] = await Promise.all([
      db.from("boats").select("*").order("name"),
      db.from("seasons").select("*").order("year", { ascending: false }),
      db
        .from("user_boat_permissions")
        .select("boat_id, user_id, created_at")
        .order("created_at", { ascending: true }),
      db.from("profiles").select("id, display_name"),
    ]);

    if (boatsError) {
      throw new Error(boatsError.message);
    }
    if (seasonsError) {
      throw new Error(seasonsError.message);
    }
    if (permissionsError) {
      throw new Error(permissionsError.message);
    }
    if (profilesError) {
      throw new Error(profilesError.message);
    }

    const seasonsByBoat = new Map<string, SeasonRow[]>();
    ((seasonsData ?? []) as SeasonRow[]).forEach((season) => {
      const existing = seasonsByBoat.get(season.boat_id) ?? [];
      existing.push(season);
      seasonsByBoat.set(season.boat_id, existing);
    });

    const profileNameById = new Map(
      ((profilesData ?? []) as Pick<ProfileRow, "id" | "display_name">[]).map((profile) => [
        profile.id,
        profile.display_name ?? null,
      ]),
    );

    const firstPermissionByBoat = new Map<string, string>();
    (
      (permissionsData ?? []) as {
        boat_id: string;
        user_id: string;
        created_at: string;
      }[]
    ).forEach((permission) => {
      if (!firstPermissionByBoat.has(permission.boat_id)) {
        firstPermissionByBoat.set(permission.boat_id, permission.user_id);
      }
    });

    const sharedBoats = ((boatsData ?? []) as BoatRow[]).map((boat) => {
      const seasons = seasonsByBoat.get(boat.id) ?? [];
      const season =
        seasons.find((entry) => entry.id === requestedSeasonId) ?? seasons[0] ?? null;
      const ownerUserId = firstPermissionByBoat.get(boat.id) ?? null;

      return {
        boat: {
          ...boat,
          image_url: getBoatImageUrl(supabase, boat.image_path, boat.updated_at),
        },
        season,
        ownerDisplayName: ownerUserId
          ? profileNameById.get(ownerUserId) ?? null
          : null,
        tripSegments: [] as TripSegmentView[],
      } satisfies SharedTimelineBoat;
    });

    const selectedBoat =
      sharedBoats.find((entry) => entry.boat.id === requestedBoatId) ??
      sharedBoats[0] ??
      null;

    if (selectedBoat?.season) {
      const { data: tripData, error: tripError } = await db.rpc(
        "get_season_trip_segments",
        {
          p_season_id: selectedBoat.season.id,
        },
      );

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

export const getSeasonGuestWorkspace = async (
  boatId: string,
  seasonId?: string,
) => {
  const session = await requireSeasonGuestSession(boatId, seasonId);
  const admin = createAdminClient();
  const canViewVisits = session.link.can_view_visits !== false;

  if (!admin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for season guest access.");
  }

  const db = admin as any;
  const [{ data: tripData, error: tripError }, { data: visitsData, error: visitsError }] =
    await Promise.all([
      db
        .from("trip_segments")
        .select(
          "id, season_id, sort_order, start_date, end_date, location_label, location_type, place_source, external_place_id, latitude, longitude, status, public_notes, created_at, updated_at",
        )
        .eq("season_id", session.season.id)
        .order("start_date")
        .order("end_date"),
      canViewVisits
        ? db
            .from("visits")
            .select(
              "id, season_id, owner_user_id, visitor_name, embark_date, disembark_date, embark_place_label, embark_latitude, embark_longitude, disembark_place_label, disembark_latitude, disembark_longitude, status, public_notes, created_at, updated_at",
            )
            .eq("season_id", session.season.id)
            .order("embark_date")
            .order("disembark_date")
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (tripError) {
    throw new Error(tripError.message);
  }

  if (visitsError) {
    throw new Error(visitsError.message);
  }

  const tripSegments = ((tripData ?? []) as any[]).map((segment) => ({
    ...segment,
    private_notes: null,
  })) as TripSegmentView[];

  const visits = ((visitsData ?? []) as any[]).map((visit) => ({
    ...visit,
    private_notes: null,
    blocks_availability: visit.status === "confirmed",
  })) as VisitView[];

  return {
    viewer: {
      profile: null,
      isSuperuser: false,
      isSeasonGuest: true,
      seasonGuestCanViewVisits: canViewVisits,
      seasonGuestCreatorName: session.creatorName,
      seasonGuestExpiresAt: session.link.expires_at,
    },
    boat: {
      ...session.boat,
      image_url: getBoatImageUrl(admin as any, session.boat.image_path, session.boat.updated_at),
    } as BoatDetails,
    permission: null,
    boats: [
      {
        boat_id: session.boat.id,
        boat_name: session.boat.name,
        permission_level: "viewer",
        can_edit: false,
        can_manage_boat_users: false,
        description: session.boat.description,
        home_port: session.boat.home_port,
        image_path: session.boat.image_path,
        image_url: getBoatImageUrl(admin as any, session.boat.image_path, session.boat.updated_at),
        model: session.boat.model,
        year_built: session.boat.year_built,
        is_active: session.boat.is_active,
      },
    ] as BoatSummary[],
    seasons: [session.season],
    selectedSeason: session.season,
    tripSegments,
    visits,
  } satisfies BoatWorkspace;
};

export const getSeasonAccessLinkStatus = async (
  boatId: string,
  seasonId: string,
) => {
  const { supabase } = await requireBoatShareAccess(boatId);
  const db = supabase as any;

  const { data, error } = await db
    .from("season_access_links")
    .select("*, creator:profiles!season_access_links_created_by_user_id_fkey(display_name)")
    .eq("boat_id", boatId)
    .eq("season_id", seasonId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const now = Date.now();
  const rows = ((data ?? []) as (SeasonAccessLinkRow & {
    creator?: { display_name?: string | null } | null;
  })[]).map((row) => ({
    ...row,
    is_active:
      !row.revoked_at &&
      new Date(row.expires_at).getTime() > now &&
      !(row.single_use && row.redeemed_at),
    creator_name: row.creator?.display_name ?? null,
  })) as SeasonAccessLinkSummary[];

  return {
    links: rows,
  };
};
