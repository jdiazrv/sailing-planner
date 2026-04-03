/* eslint-disable @typescript-eslint/no-explicit-any */

import type { SharedTimelineBoat, TripSegmentView } from "@/lib/planning";

import {
  getBoatImageUrl,
  type BoatRow,
  type ProfileRow,
  type SeasonRow,
} from "@/lib/boat-data-core";
import { requireViewer } from "@/lib/boat-data-viewer";

export const SharedTimelineErrorCode = {
  PublicTimelineMigrationRequired: "PUBLIC_TIMELINE_MIGRATION_REQUIRED",
} as const;

export type SharedTimelineErrorCode =
  (typeof SharedTimelineErrorCode)[keyof typeof SharedTimelineErrorCode];

export class SharedTimelineError extends Error {
  code: SharedTimelineErrorCode;

  constructor(code: SharedTimelineErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "SharedTimelineError";
  }
}

const asSharedTimelineError = (error: { code?: string; message?: string }) => {
  if (error.code === "42703") {
    return new SharedTimelineError(
      SharedTimelineErrorCode.PublicTimelineMigrationRequired,
      "Falta aplicar la migracion de timelines publicos en Supabase remoto.",
    );
  }

  return new Error(error.message ?? "Shared timelines unavailable.");
};

const emptySharedWorkspace = (viewer: Awaited<ReturnType<typeof requireViewer>>["viewer"]) => ({
  viewer,
  boats: [] as SharedTimelineBoat[],
  selectedBoat: null as SharedTimelineBoat | null,
  selectedBoatId: null as string | null,
  seasons: [] as SeasonRow[],
  selectedSeason: null as SeasonRow | null,
});

export const getSharedTimelineWorkspace = async (
  requestedBoatId?: string,
  requestedSeasonId?: string,
) => {
  const { supabase, user, viewer } = await requireViewer();
  const db = supabase as any;
  const viewerIsPublic = Boolean(viewer.profile?.is_timeline_public);

  if (!viewer.isSuperuser && !viewerIsPublic) {
    return emptySharedWorkspace(viewer);
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
    throw asSharedTimelineError(profilesError);
  }

  const publicProfiles = (profilesData ?? []) as Pick<
    ProfileRow,
    "id" | "display_name" | "is_timeline_public"
  >[];
  const publicUserIds = publicProfiles.map((profile) => profile.id);

  if (!publicUserIds.length) {
    return emptySharedWorkspace(viewer);
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
    return emptySharedWorkspace(viewer);
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
