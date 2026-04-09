/* eslint-disable @typescript-eslint/no-explicit-any */

import { cache } from "react";
import { redirect } from "next/navigation";

import { measureServerTiming, startServerTiming } from "@/lib/server-timing";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSeasonGuestSession } from "@/lib/season-access-server";
import type {
  BoatDetails,
  BoatRow,
  BoatSummary,
  BoatWorkspace,
  PermissionRow,
  SeasonAccessLinkRow,
  SeasonRow,
  PortStopView,
  VisitView,
} from "@/lib/planning";

import {
  getAccessibleBoatBase,
  getBoatAggregateData,
  getBoatImageUrl,
  getVisitImageUrls,
  mapBoatRowToSummary,
} from "@/lib/boat-data-core";
import { requireViewer } from "@/lib/boat-data-viewer";

type ExtendedBoatRow = BoatRow & {
  model?: string | null;
  year_built?: number | null;
  home_port?: string | null;
};

const getSelectedSeasonFromList = (
  seasons: SeasonRow[],
  requestedSeasonId?: string,
) => seasons.find((season) => season.id === requestedSeasonId) ?? seasons[0] ?? null;

const buildBoatDetails = (
  supabase: Awaited<ReturnType<typeof requireViewer>>["supabase"],
  boatRow: ExtendedBoatRow,
) => ({
  ...boatRow,
  image_url: getBoatImageUrl(supabase, boatRow.image_path, boatRow.updated_at),
}) as BoatDetails;

const loadBoatPermission = async (
  db: any,
  userId: string,
  boatId: string,
) => {
  const { data } = await measureServerTiming(
    "boatData.loadBoatPermission",
    () =>
      db
        .from("user_boat_permissions")
        .select("*")
        .eq("boat_id", boatId)
        .eq("user_id", userId)
        .maybeSingle(),
    { boatId, userId },
  );

  return (data ?? null) as PermissionRow | null;
};

const loadBoatRow = async (db: any, boatId: string) => {
  const { data } = await measureServerTiming(
    "boatData.loadBoatRow",
    () => db.from("boats").select("*").eq("id", boatId).maybeSingle(),
    { boatId },
  );
  return (data ?? null) as ExtendedBoatRow | null;
};

const loadBoatSeasons = async (db: any, boatId: string) => {
  const { data } = await measureServerTiming(
    "boatData.loadBoatSeasons",
    () =>
      db.from("seasons").select("*").eq("boat_id", boatId).order("year", {
        ascending: false,
      }),
    { boatId },
  );

  return (data ?? []) as SeasonRow[];
};

const loadBoatContext = async ({
  db,
  userId,
  boatId,
  includeSeasons = true,
}: {
  db: any;
  userId: string;
  boatId: string;
  includeSeasons?: boolean;
}) => {
  return measureServerTiming(
    "boatData.loadBoatContext",
    async () => {
      const tasks = [loadBoatRow(db, boatId), loadBoatPermission(db, userId, boatId)] as const;

      if (!includeSeasons) {
        const [boatRow, permission] = await Promise.all(tasks);
        return { boatRow, permission, seasons: [] as SeasonRow[] };
      }

      const [boatRow, permission, seasons] = await Promise.all([
        ...tasks,
        loadBoatSeasons(db, boatId),
      ]);

      return { boatRow, permission, seasons };
    },
    { boatId, userId, includeSeasons },
    (result) => ({
      boatId,
      hasBoat: Boolean(result.boatRow),
      hasPermission: Boolean(result.permission),
      seasons: result.seasons.length,
    }),
  );
};

const loadSeasonWorkspaceData = async (
  db: any,
  selectedSeason: SeasonRow | null,
  options?: { includeVisits?: boolean },
) => {
  const timing = startServerTiming("boatData.loadSeasonWorkspaceData", {
    seasonId: selectedSeason?.id ?? null,
    includeVisits: options?.includeVisits ?? true,
  });
  if (!selectedSeason) {
    timing.end({ skipped: true });
    return {
      tripSegments: [] as PortStopView[],
      visits: [] as VisitView[],
    };
  }

  const includeVisits = options?.includeVisits ?? true;
  const [tripResult, visitResult] = await Promise.all([
    measureServerTiming(
      "boatData.loadSeasonWorkspaceData.tripRpc",
      () =>
        db.rpc("get_season_port_stops", {
          p_season_id: selectedSeason.id,
        }),
      { seasonId: selectedSeason.id },
    ),
    includeVisits
      ? measureServerTiming(
          "boatData.loadSeasonWorkspaceData.visitRpc",
          () =>
            db.rpc("get_season_visits", {
              p_season_id: selectedSeason.id,
            }),
          { seasonId: selectedSeason.id },
        )
      : Promise.resolve({ data: [] }),
  ]);

  const rawVisits = (visitResult.data ?? []) as VisitView[];
  const imageTiming = startServerTiming("boatData.loadSeasonWorkspaceData.signVisitImages", {
    seasonId: selectedSeason.id,
    visits: rawVisits.length,
  });
  const visitImageUrls = await getVisitImageUrls(rawVisits.map((visit) => visit.image_path));
  const visits = rawVisits.map((visit) => ({
    ...visit,
    image_url: visit.image_path ? visitImageUrls.get(visit.image_path) ?? null : null,
  }));
  imageTiming.end({
    seasonId: selectedSeason.id,
    visits: rawVisits.length,
    images: rawVisits.filter((visit) => Boolean(visit.image_path)).length,
  });

  const result = {
    tripSegments: (tripResult.data ?? []) as PortStopView[],
    visits,
  };

  timing.end({
    seasonId: selectedSeason.id,
    tripSegments: result.tripSegments.length,
    visits: result.visits.length,
  });

  return result;
};

const getBoatWorkspaceContext = cache(async (boatId: string) => {
  const timing = startServerTiming("boatData.getBoatWorkspaceContext", { boatId });
  const { supabase, user, viewer } = await measureServerTiming(
    "boatData.getBoatWorkspaceContext.requireViewer",
    () => requireViewer(),
    { boatId },
  );
  const db = supabase as any;

  const { boatRow, permission, seasons } = await measureServerTiming(
    "boatData.getBoatWorkspaceContext.context",
    () =>
      loadBoatContext({
        db,
        userId: user.id,
        boatId,
      }),
    { boatId, userId: user.id },
    (result) => ({
      hasBoat: Boolean(result.boatRow),
      hasPermission: Boolean(result.permission),
      seasons: result.seasons.length,
    }),
  );

  if (!boatRow) {
    redirect("/dashboard");
  }

  const result = {
    supabase,
    viewer,
    boatRow,
    permission,
    seasons,
  };

  timing.end({
    seasons: seasons.length,
    hasPermission: Boolean(permission),
  });

  return result;
});

export const getAccessibleBoatsLite = cache(async () => {
  const { supabase, viewer } = await requireViewer();
  return getAccessibleBoatBase(supabase, viewer);
});

export const getAccessibleBoats = cache(async () => {
  const timing = startServerTiming("boatData.getAccessibleBoats");
  const { supabase, viewer } = await requireViewer();
  const db = supabase as any;
  const baseBoats = await getAccessibleBoatBase(supabase, viewer);
  const aggregateData = await getBoatAggregateData(
    db,
    baseBoats.map((boat) => boat.boat_id),
  );
  const boats = baseBoats.map((boat) => ({
    ...boat,
    port_stops_count: aggregateData.tripSegmentsCountByBoat.get(boat.boat_id) ?? 0,
    visits_count: aggregateData.visitsCountByBoat.get(boat.boat_id) ?? 0,
    active_invites_count: aggregateData.activeInvitesCountByBoat.get(boat.boat_id) ?? 0,
    user_last_access_at: aggregateData.userLastAccessByBoat.get(boat.boat_id)?.lastAccessAt ?? null,
    user_display_name: aggregateData.userLastAccessByBoat.get(boat.boat_id)?.displayName ?? null,
  })) as BoatSummary[];
  timing.end({ boats: boats.length });
  return boats;
});

export const getSuperuserDashboardSnapshot = cache(async (
  options?: { requestedBoatId?: string; requestedSeasonId?: string; lastBoatId?: string },
) => {
  const timing = startServerTiming("boatData.getSuperuserDashboardSnapshot", options);
  const { supabase, viewer } = await requireViewer();
  if (!viewer.isSuperuser) {
    timing.end({ skipped: true });
    return null;
  }

  const db = supabase as any;
  const { data: boatCountRows } = await db.from("boats").select("id, is_active");
  const totalBoats = ((boatCountRows ?? []) as Pick<BoatRow, "id" | "is_active">[]).length;
  const activeBoats = ((boatCountRows ?? []) as Pick<BoatRow, "id" | "is_active">[]).filter(
    (boat) => boat.is_active !== false,
  ).length;

  const loadBoatById = async (boatId: string | undefined | null) => {
    if (!boatId) {
      return null;
    }

    const { data } = await db
      .from("boats")
      .select("id, name, description, is_active, model, year_built, home_port, image_path, updated_at")
      .eq("id", boatId)
      .maybeSingle();

    return data
      ? mapBoatRowToSummary(
          supabase,
          viewer,
          data as BoatRow & {
            model?: string | null;
            year_built?: number | null;
            home_port?: string | null;
          },
        )
      : null;
  };

  let selectedBoat =
    await loadBoatById(options?.requestedBoatId) ??
    await loadBoatById(options?.lastBoatId);

  if (!selectedBoat) {
    const { data } = await db
      .from("boats")
      .select("id, name, description, is_active, model, year_built, home_port, image_path, updated_at")
      .order("name")
      .limit(1)
      .maybeSingle();

    if (data) {
      selectedBoat = mapBoatRowToSummary(
        supabase,
        viewer,
        data as BoatRow & {
          model?: string | null;
          year_built?: number | null;
          home_port?: string | null;
        },
      );
    }
  }

  let selectedSeasonName: string | null = null;
  if (selectedBoat) {
    let seasonQuery = db
      .from("seasons")
      .select("name, year")
      .eq("boat_id", selectedBoat.boat_id);

    if (options?.requestedSeasonId) {
      seasonQuery = seasonQuery.eq("id", options.requestedSeasonId);
    } else {
      seasonQuery = seasonQuery.order("year", { ascending: false }).limit(1);
    }

    const { data: seasonData } = await seasonQuery.maybeSingle();

    selectedSeasonName =
      seasonData?.name ?? (seasonData?.year ? String(seasonData.year) : null);
  }

  const boats = selectedBoat ? [selectedBoat] : [];

  const result = {
    viewer,
    boats,
    totalBoats,
    activeBoats,
    selectedSeasonName,
  };
  timing.end({
    boats: result.boats.length,
    totalBoats: result.totalBoats,
    activeBoats: result.activeBoats,
    selectedSeasonName: result.selectedSeasonName,
  });
  return result;
});

export const getBoatSelectedSeason = cache(async (
  boatId: string,
  requestedSeasonId?: string,
) => {
  const { supabase } = await requireViewer();
  const db = supabase as any;
  const seasons = await loadBoatSeasons(db, boatId);
  const selectedSeason = getSelectedSeasonFromList(seasons, requestedSeasonId);

  return {
    seasons,
    selectedSeason,
  };
});

export const getDashboardBoatWorkspace = cache(async (
  boatId: string,
  requestedSeasonId?: string,
) => {
  const timing = startServerTiming("boatData.getDashboardBoatWorkspace", {
    boatId,
    requestedSeasonId: requestedSeasonId ?? null,
  });
  const { supabase, user, viewer } = await requireViewer();
  const db = supabase as any;

  const { boatRow, permission, seasons } = await loadBoatContext({
    db,
    userId: user.id,
    boatId,
  });

  if (!boatRow) {
    redirect("/dashboard");
  }
  const selectedSeason = getSelectedSeasonFromList(seasons, requestedSeasonId);
  const { tripSegments, visits } = await loadSeasonWorkspaceData(db, selectedSeason);

  const result = {
    viewer,
    boat: buildBoatDetails(supabase, boatRow),
    permission,
    seasons,
    selectedSeason,
    tripSegments,
    visits,
  };
  timing.end({
    seasonId: selectedSeason?.id ?? null,
    seasons: seasons.length,
    tripSegments: tripSegments.length,
    visits: visits.length,
    hasPermission: Boolean(permission),
  });
  return result;
});

export const getBoatShareWorkspace = cache(async (
  boatId: string,
  requestedSeasonId?: string,
) => {
  const timing = startServerTiming("boatData.getBoatShareWorkspace", {
    boatId,
    requestedSeasonId: requestedSeasonId ?? null,
  });
  const { supabase, viewer, boatRow, permission, seasons } = await getBoatWorkspaceContext(boatId);

  if (!viewer.isSuperuser && !permission) {
    redirect("/dashboard");
  }

  const selectedSeason = getSelectedSeasonFromList(seasons, requestedSeasonId);

  const result = {
    viewer,
    boat: buildBoatDetails(supabase, boatRow),
    permission,
    seasons,
    selectedSeason,
  };

  timing.end({
    seasonId: selectedSeason?.id ?? null,
    seasons: seasons.length,
    hasPermission: Boolean(permission),
  });

  return result;
});

export const getBoatTimelineSnapshot = cache(async (
  boatId: string,
  requestedSeasonId?: string,
) => {
  const { supabase, viewer, boatRow, permission, seasons } = await getBoatWorkspaceContext(boatId);
  const db = supabase as any;
  const selectedSeason = getSelectedSeasonFromList(seasons, requestedSeasonId);
  const { tripSegments } = await loadSeasonWorkspaceData(db, selectedSeason, {
    includeVisits: false,
  });

  return {
    viewer,
    boat: buildBoatDetails(supabase, boatRow),
    permission,
    seasons,
    selectedSeason,
    tripSegments,
  };
});

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

export const getBoatWorkspace = cache(async (
  boatId: string,
  requestedSeasonId?: string,
) => {
  const timing = startServerTiming("boatData.getBoatWorkspace", {
    boatId,
    requestedSeasonId: requestedSeasonId ?? null,
  });
  const { supabase, viewer, boatRow, permission, seasons } = await measureServerTiming(
    "boatData.getBoatWorkspace.base",
    () => getBoatWorkspaceContext(boatId),
    { boatId },
    (result) => ({ seasons: result.seasons.length }),
  );
  const db = supabase as any;

  const selectedSeason = getSelectedSeasonFromList(seasons, requestedSeasonId);
  const { tripSegments, visits } = await measureServerTiming(
    "boatData.getBoatWorkspace.seasonData",
    () => loadSeasonWorkspaceData(db, selectedSeason),
    {
      boatId,
      seasonId: selectedSeason?.id ?? null,
    },
    (result) => ({
      tripSegments: result.tripSegments.length,
      visits: result.visits.length,
    }),
  );

  const result = {
    viewer,
    boat: buildBoatDetails(supabase, boatRow),
    permission,
    seasons,
    selectedSeason,
    tripSegments,
    visits,
  } satisfies BoatWorkspace;
  timing.end({
    seasonId: selectedSeason?.id ?? null,
    seasons: seasons.length,
    tripSegments: tripSegments.length,
    visits: visits.length,
  });
  return result;
});

export const getBoatLayoutSnapshot = cache(async (boatId: string) => {
  const timing = startServerTiming("boatData.getBoatLayoutSnapshot", { boatId });
  const { supabase, viewer, boatRow, permission } = await getBoatWorkspaceContext(boatId);
  const boats = viewer.isSuperuser
    ? await measureServerTiming(
        "boatData.getBoatLayoutSnapshot.accessibleBoats",
        () => getAccessibleBoatBase(supabase, viewer),
        { boatId, isSuperuser: viewer.isSuperuser },
        (result) => ({ boats: result.length }),
      )
    : [];

  const result = {
    viewer,
    boat: buildBoatDetails(supabase, boatRow),
    permission,
    boats,
  };

  timing.end({ boats: boats.length, hasPermission: Boolean(permission) });
  return result;
});

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
        .from("port_stops")
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
              "id, season_id, owner_user_id, visitor_name, badge_emoji, image_path, embark_date, disembark_date, embark_place_label, embark_latitude, embark_longitude, disembark_place_label, disembark_latitude, disembark_longitude, status, public_notes, created_at, updated_at",
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
  })) as PortStopView[];

  const rawVisits = (visitsData ?? []) as any[];
  const imageTiming = startServerTiming("boatData.getSeasonGuestWorkspace.signVisitImages", {
    seasonId: session.season.id,
    visits: rawVisits.length,
  });
  const visitImageUrls = await getVisitImageUrls(rawVisits.map((visit) => visit.image_path));
  const visits = rawVisits.map((visit) => ({
    ...visit,
    private_notes: null,
    blocks_availability: visit.status === "confirmed",
    image_url: visit.image_path ? visitImageUrls.get(visit.image_path) ?? null : null,
  })) as VisitView[];
  imageTiming.end({
    seasonId: session.season.id,
    visits: rawVisits.length,
    images: rawVisits.filter((visit) => Boolean(visit.image_path)).length,
  });

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
  const timing = startServerTiming("boatData.getSeasonAccessLinkStatus", {
    boatId,
    seasonId,
  });
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
  }));

  const result = {
    links: rows,
  };
  timing.end({
    links: rows.length,
    activeLinks: rows.filter((row) => row.is_active).length,
  });
  return result;
};
