/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  BoatSummary,
  ViewerContext,
} from "@/lib/planning";

export type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];
export type BoatRow = Database["public"]["Tables"]["boats"]["Row"];
export type PermissionRow = Database["public"]["Tables"]["user_boat_permissions"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type BoatOverviewRow = Database["public"]["Views"]["boat_access_overview"]["Row"];
export type SeasonAccessLinkRow =
  Database["public"]["Tables"]["season_access_links"]["Row"];

export type BoatAggregateData = {
  tripSegmentsCountByBoat: Map<string, number>;
  visitsCountByBoat: Map<string, number>;
  activeInvitesCountByBoat: Map<string, number>;
  userLastAccessByBoat: Map<
    string,
    { lastAccessAt: string | null; displayName: string | null; email: string | null }
  >;
  usersCountByBoat: Map<string, number>;
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

export const mapBoatRowToSummary = (
  supabase: Awaited<ReturnType<typeof createClient>>,
  viewer: ViewerContext,
  boat: BoatRow & {
    model?: string | null;
    year_built?: number | null;
    home_port?: string | null;
  },
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
  const aggregateData: BoatAggregateData = {
    tripSegmentsCountByBoat: new Map<string, number>(),
    visitsCountByBoat: new Map<string, number>(),
    activeInvitesCountByBoat: new Map<string, number>(),
    userLastAccessByBoat: new Map<
      string,
      { lastAccessAt: string | null; displayName: string | null; email: string | null }
    >(),
    usersCountByBoat: new Map<string, number>(),
  };

  if (!boatIds.length) {
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
        .select("boat_id, user_id")
        .in("boat_id", boatIds),
    ]);

  const permissionRows = (permissionsData ?? []) as Pick<
    PermissionRow,
    "boat_id" | "user_id"
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
      db.from("trip_segments").select("season_id").in("season_id", seasonIds),
      db.from("visits").select("season_id").in("season_id", seasonIds),
    ]);

    ((tripRows ?? []) as Pick<Database["public"]["Tables"]["trip_segments"]["Row"], "season_id">[])
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

    const profile = profileById.get(permission.user_id);
    if (!profile || profile.is_superuser) {
      return;
    }

    updateLastAccess(aggregateData.userLastAccessByBoat, permission.boat_id, profile);
  });

  usersByBoat.forEach((users, boatId) => {
    aggregateData.usersCountByBoat.set(boatId, users.size);
  });

  return aggregateData;
};
