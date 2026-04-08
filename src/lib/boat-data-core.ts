/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { measureServerTiming, startServerTiming } from "@/lib/server-timing";
import type { Database } from "@/types/database";
import type {
  BoatRow,
  BoatSummary,
  PermissionRow,
  ProfileRow,
  SeasonAccessLinkRow,
  SeasonRow,
  ViewerContext,
} from "@/lib/planning";

export type BoatOverviewRow = Database["public"]["Views"]["boat_access_overview"]["Row"];

type ExtendedBoatRow = BoatRow & {
  model?: string | null;
  year_built?: number | null;
  home_port?: string | null;
};

export type BoatAggregateData = {
  tripSegmentsCountByBoat: Map<string, number>;
  visitsCountByBoat: Map<string, number>;
  activeInvitesCountByBoat: Map<string, number>;
  userLastAccessByBoat: Map<
    string,
    { lastAccessAt: string | null; displayName: string | null; email: string | null }
  >;
  usersCountByBoat: Map<string, number>;
  managersCountByBoat: Map<string, number>;
  editorsCountByBoat: Map<string, number>;
};

export const getBoatImageUrl = (
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

export const getVisitImageUrl = async (
  imagePath: string | null | undefined,
) => {
  if (!imagePath) {
    return null;
  }

  const admin = createAdminClient();
  if (!admin) {
    return null;
  }

  const { data, error } = await admin.storage
    .from("visit-images")
    .createSignedUrl(imagePath, 60 * 60 * 24 * 7);

  if (error) {
    return null;
  }

  return data?.signedUrl ?? null;
};

export const getVisitImageUrls = async (
  imagePaths: Array<string | null | undefined>,
) => {
  const uniquePaths = [...new Set(
    imagePaths.filter(
      (path): path is string => typeof path === "string" && path.length > 0,
    ),
  )];

  if (!uniquePaths.length) {
    return new Map<string, string | null>();
  }

  const admin = createAdminClient();
  if (!admin) {
    return new Map(uniquePaths.map((path) => [path, null]));
  }

  const { data, error } = await admin.storage
    .from("visit-images")
    .createSignedUrls(uniquePaths, 60 * 60 * 24 * 7);

  if (error) {
    return new Map(uniquePaths.map((path) => [path, null]));
  }

  return new Map(
    uniquePaths.map((path, index) => [path, data?.[index]?.signedUrl ?? null]),
  );
};

export const mapBoatRowToSummary = (
  supabase: Awaited<ReturnType<typeof createClient>>,
  viewer: ViewerContext,
  boat: ExtendedBoatRow,
) => ({
  boat_id: boat.id,
  boat_name: boat.name,
  permission_level: viewer.isSuperuser ? null : "viewer",
  can_edit: Boolean(viewer.isSuperuser),
  can_manage_boat_users: Boolean(viewer.isSuperuser),
  description: boat.description,
  home_port: boat.home_port ?? null,
  image_path: boat.image_path ?? null,
  image_url: getBoatImageUrl(supabase, boat.image_path, boat.updated_at),
  model: boat.model ?? null,
  year_built: boat.year_built ?? null,
  is_active: boat.is_active,
}) as BoatSummary;

export const getAccessibleBoatBase = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  viewer: ViewerContext,
) => {
  const db = supabase as any;
  const [{ data }, { data: overviewData }] = await Promise.all([
    measureServerTiming(
      "boatData.getAccessibleBoatBase.boats",
      () =>
        db
          .from("boats")
          .select(
            "id, name, description, is_active, model, year_built, home_port, image_path, updated_at",
          )
          .order("name"),
      { isSuperuser: viewer.isSuperuser },
    ),
    measureServerTiming(
      "boatData.getAccessibleBoatBase.overview",
      () =>
        db
          .from("boat_access_overview")
          .select("boat_id, boat_name, permission_level, can_edit, can_manage_boat_users")
          .order("boat_name"),
      { isSuperuser: viewer.isSuperuser },
    ),
  ]);

  const overviewByBoat = new Map(
    ((overviewData ?? []) as BoatOverviewRow[]).map((row: BoatOverviewRow) => [
      row.boat_id,
      row,
    ]),
  );

  const boatRows = (data ?? []) as ExtendedBoatRow[];

  return measureServerTiming(
    "boatData.getAccessibleBoatBase.mapSummaries",
    async () =>
      boatRows.map((boat) => {
        const overview = overviewByBoat.get(boat.id);
        const canManageFromRole = overview?.permission_level === "manager";

        return {
          boat_id: boat.id,
          boat_name: boat.name,
          permission_level:
            overview?.permission_level ?? (viewer.isSuperuser ? null : "viewer"),
          can_edit: overview?.can_edit ?? Boolean(viewer.isSuperuser),
          can_manage_boat_users:
            overview?.can_manage_boat_users ?? canManageFromRole ?? Boolean(viewer.isSuperuser),
          description: boat.description,
          home_port: boat.home_port ?? null,
          image_path: boat.image_path ?? null,
          image_url: getBoatImageUrl(supabase, boat.image_path, boat.updated_at),
          model: boat.model ?? null,
          year_built: boat.year_built ?? null,
          is_active: boat.is_active,
        };
      }) as BoatSummary[],
    {
      boats: boatRows.length,
      overviewRows: overviewByBoat.size,
    },
    (boats) => ({ boats: boats.length }),
  );
};

const updateLastAccess = (
  bucket: Map<
    string,
    { lastAccessAt: string | null; displayName: string | null; email: string | null }
  >,
  boatId: string,
  profile: Pick<ProfileRow, "display_name" | "email" | "last_sign_in_at">,
) => {
  const currentLastAccess = bucket.get(boatId);
  const nextLastAccess = profile.last_sign_in_at ?? null;

  if (
    currentLastAccess &&
    (currentLastAccess.lastAccessAt ?? "") >= (nextLastAccess ?? "")
  ) {
    return;
  }

  bucket.set(boatId, {
    lastAccessAt: nextLastAccess,
    displayName: profile.display_name ?? null,
    email: profile.email ?? null,
  });
};

export const getBoatAggregateData = async (
  db: any,
  boatIds: string[],
) => {
  const timing = startServerTiming("boatData.getBoatAggregateData", {
    boatIds: boatIds.length,
  });
  const aggregateData: BoatAggregateData = {
    tripSegmentsCountByBoat: new Map<string, number>(),
    visitsCountByBoat: new Map<string, number>(),
    activeInvitesCountByBoat: new Map<string, number>(),
    userLastAccessByBoat: new Map<
      string,
      { lastAccessAt: string | null; displayName: string | null; email: string | null }
    >(),
    usersCountByBoat: new Map<string, number>(),
    managersCountByBoat: new Map<string, number>(),
    editorsCountByBoat: new Map<string, number>(),
  };

  if (!boatIds.length) {
    timing.end({ skipped: true });
    return aggregateData;
  }

  const [{ data: seasonsData }, { data: linksData }, { data: permissionsData }] =
    await Promise.all([
      db.from("seasons").select("id, boat_id").in("boat_id", boatIds),
      db
        .from("season_access_links")
        .select("boat_id, revoked_at, expires_at, single_use, redeemed_at")
        .in("boat_id", boatIds),
      db
        .from("user_boat_permissions")
        .select("boat_id, user_id, permission_level")
        .in("boat_id", boatIds),
    ]);

  const permissionRows = (permissionsData ?? []) as Pick<
    PermissionRow,
    "boat_id" | "user_id" | "permission_level"
  >[];
  const userIds = [...new Set(permissionRows.map((permission) => permission.user_id))];
  const { data: profilesData } = userIds.length
    ? await db
        .from("profiles")
        .select("id, display_name, email, is_superuser, last_sign_in_at")
        .in("id", userIds)
    : { data: [] };

  const seasonRows = (seasonsData ?? []) as Pick<SeasonRow, "id" | "boat_id">[];
  const seasonById = new Map(seasonRows.map((season) => [season.id, season.boat_id]));
  const seasonIds = seasonRows.map((season) => season.id);

  if (seasonIds.length) {
    const [{ data: tripRows }, { data: visitRows }] = await Promise.all([
      db.from("port_stops").select("season_id").in("season_id", seasonIds),
      db.from("visits").select("season_id").in("season_id", seasonIds),
    ]);

    ((tripRows ?? []) as Pick<Database["public"]["Tables"]["port_stops"]["Row"], "season_id">[])
      .forEach((row) => {
        const boatId = seasonById.get(row.season_id);
        if (!boatId) return;
        aggregateData.tripSegmentsCountByBoat.set(
          boatId,
          (aggregateData.tripSegmentsCountByBoat.get(boatId) ?? 0) + 1,
        );
      });

    ((visitRows ?? []) as Pick<Database["public"]["Tables"]["visits"]["Row"], "season_id">[])
      .forEach((row) => {
        const boatId = seasonById.get(row.season_id);
        if (!boatId) return;
        aggregateData.visitsCountByBoat.set(
          boatId,
          (aggregateData.visitsCountByBoat.get(boatId) ?? 0) + 1,
        );
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
    aggregateData.activeInvitesCountByBoat.set(
      row.boat_id,
      (aggregateData.activeInvitesCountByBoat.get(row.boat_id) ?? 0) + 1,
    );
  });

  const profileById = new Map(
    (
      (profilesData ?? []) as Pick<
        ProfileRow,
        "id" | "display_name" | "email" | "is_superuser" | "last_sign_in_at"
      >[]
    ).map((profile) => [profile.id, profile]),
  );

  const usersByBoat = new Map<string, Set<string>>();

  permissionRows.forEach((permission) => {
    const users = usersByBoat.get(permission.boat_id) ?? new Set<string>();
    users.add(permission.user_id);
    usersByBoat.set(permission.boat_id, users);

    if (permission.permission_level === "manager") {
      aggregateData.managersCountByBoat.set(
        permission.boat_id,
        (aggregateData.managersCountByBoat.get(permission.boat_id) ?? 0) + 1,
      );
    } else if (permission.permission_level === "editor") {
      aggregateData.editorsCountByBoat.set(
        permission.boat_id,
        (aggregateData.editorsCountByBoat.get(permission.boat_id) ?? 0) + 1,
      );
    }

    const profile = profileById.get(permission.user_id);
    if (!profile || profile.is_superuser) {
      return;
    }

    updateLastAccess(aggregateData.userLastAccessByBoat, permission.boat_id, profile);
  });

  usersByBoat.forEach((users, boatId) => {
    aggregateData.usersCountByBoat.set(boatId, users.size);
  });

  timing.end({
    boatIds: boatIds.length,
    seasonRows: seasonRows.length,
    permissions: permissionRows.length,
    usersWithAccess: usersByBoat.size,
  });

  return aggregateData;
};
