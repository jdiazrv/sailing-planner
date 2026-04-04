/* eslint-disable @typescript-eslint/no-explicit-any */

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BoatDetails,
  BoatRow,
  PermissionRow,
  ProfileRow,
  UserAdminProfile,
} from "@/lib/planning";

import {
  getBoatAggregateData,
  getBoatImageUrl,
} from "@/lib/boat-data-core";
import { requireUserAdminAccess } from "@/lib/boat-data-viewer";

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
  const aggregateData = await getBoatAggregateData(db, boatIds);

  return boatRows.map((boat) => ({
    ...boat,
    image_url: getBoatImageUrl(supabase, boat.image_path, boat.updated_at),
    trip_segments_count: aggregateData.tripSegmentsCountByBoat.get(boat.id) ?? 0,
    visits_count: aggregateData.visitsCountByBoat.get(boat.id) ?? 0,
    active_invites_count: aggregateData.activeInvitesCountByBoat.get(boat.id) ?? 0,
    user_last_access_at: aggregateData.userLastAccessByBoat.get(boat.id)?.lastAccessAt ?? null,
    user_display_name: aggregateData.userLastAccessByBoat.get(boat.id)?.displayName ?? null,
    user_email: aggregateData.userLastAccessByBoat.get(boat.id)?.email ?? null,
    users_count: aggregateData.usersCountByBoat.get(boat.id) ?? 0,
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
  const boatsByUser = new Map<string, Set<string>>();

  permissions.forEach((permission) => {
    const existing = permissionsByUser.get(permission.user_id) ?? [];
    existing.push(permission);
    permissionsByUser.set(permission.user_id, existing);

    const boats = boatsByUser.get(permission.user_id) ?? new Set<string>();
    boats.add(permission.boat_id);
    boatsByUser.set(permission.user_id, boats);
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

  const visibleProfileIds = profiles.map((profile) => profile.id);
  const visibleBoatIds = [...new Set(permissions.map((permission) => permission.boat_id))];
  const seasonsCountByUser = new Map<string, number>();
  const tripSegmentsCountByUser = new Map<string, number>();
  const visitsCountByUser = new Map<string, number>();
  const invitesGeneratedCountByUser = new Map<string, number>();
  const seasonsByBoat = new Map<
    string,
    { id: string; boat_id: string; year: number; start_date: string }[]
  >();

  if (visibleBoatIds.length || visibleProfileIds.length) {
    const { data: seasonsData, error: seasonsError } = visibleBoatIds.length
      ? await db
          .from("seasons")
          .select("id, boat_id, year, start_date")
          .in("boat_id", visibleBoatIds)
      : { data: [], error: null };

    if (seasonsError) {
      throw new Error(seasonsError.message);
    }

    ((seasonsData ?? []) as { id: string; boat_id: string; year: number; start_date: string }[]).forEach((season) => {
      const list = seasonsByBoat.get(season.boat_id) ?? [];
      list.push(season);
      seasonsByBoat.set(season.boat_id, list);
    });

    const latestSeasonByBoat = new Map<
      string,
      { id: string; boat_id: string; year: number; start_date: string }
    >();

    seasonsByBoat.forEach((seasons, boatId) => {
      const latest = [...seasons].sort((left, right) => {
        if (right.year !== left.year) {
          return right.year - left.year;
        }

        return right.start_date.localeCompare(left.start_date);
      })[0];

      if (latest) {
        latestSeasonByBoat.set(boatId, latest);
      }
    });

    const latestSeasonIds = [...new Set([...latestSeasonByBoat.values()].map((season) => season.id))];

    if (latestSeasonIds.length || visibleProfileIds.length) {
      const [
        { data: tripSegmentsData, error: tripSegmentsError },
        { data: visitsData, error: visitsError },
        { data: invitesData, error: invitesError },
      ] = await Promise.all([
        latestSeasonIds.length
          ? db.from("trip_segments").select("season_id").in("season_id", latestSeasonIds)
          : Promise.resolve({ data: [], error: null }),
        latestSeasonIds.length
          ? db.from("visits").select("season_id").in("season_id", latestSeasonIds)
          : Promise.resolve({ data: [], error: null }),
        latestSeasonIds.length && visibleProfileIds.length
          ? db
              .from("season_access_links")
              .select("created_by_user_id, season_id")
              .in("created_by_user_id", visibleProfileIds)
              .in("season_id", latestSeasonIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (tripSegmentsError) {
        throw new Error(tripSegmentsError.message);
      }
      if (visitsError) {
        throw new Error(visitsError.message);
      }
      if (invitesError) {
        throw new Error(invitesError.message);
      }

      const tripCountBySeason = new Map<string, number>();
      const visitCountBySeason = new Map<string, number>();

      ((tripSegmentsData ?? []) as { season_id: string }[]).forEach((segment) => {
        tripCountBySeason.set(
          segment.season_id,
          (tripCountBySeason.get(segment.season_id) ?? 0) + 1,
        );
      });

      ((visitsData ?? []) as { season_id: string }[]).forEach((visit) => {
        visitCountBySeason.set(
          visit.season_id,
          (visitCountBySeason.get(visit.season_id) ?? 0) + 1,
        );
      });

      ((invitesData ?? []) as { created_by_user_id: string; season_id: string }[]).forEach(
        (invite) => {
          invitesGeneratedCountByUser.set(
            invite.created_by_user_id,
            (invitesGeneratedCountByUser.get(invite.created_by_user_id) ?? 0) + 1,
          );
        },
      );

      boatsByUser.forEach((boatIds, userId) => {
        let seasonsCount = 0;
        let tripSegmentsCount = 0;
        let visitsCount = 0;

        boatIds.forEach((boatId) => {
          const seasons = seasonsByBoat.get(boatId) ?? [];
          seasonsCount += seasons.length;
          const latestSeason = latestSeasonByBoat.get(boatId);
          if (latestSeason) {
            tripSegmentsCount += tripCountBySeason.get(latestSeason.id) ?? 0;
            visitsCount += visitCountBySeason.get(latestSeason.id) ?? 0;
          }
        });

        seasonsCountByUser.set(userId, seasonsCount);
        tripSegmentsCountByUser.set(userId, tripSegmentsCount);
        visitsCountByUser.set(userId, visitsCount);
      });
    }
  }

  return profiles.map((profile) => ({
    ...profile,
    permissions: permissionsByUser.get(profile.id) ?? [],
    boats_count: boatsByUser.get(profile.id)?.size ?? 0,
    seasons_count: seasonsCountByUser.get(profile.id) ?? 0,
    trip_segments_count: tripSegmentsCountByUser.get(profile.id) ?? 0,
    visits_count: visitsCountByUser.get(profile.id) ?? 0,
    invites_generated_count: invitesGeneratedCountByUser.get(profile.id) ?? 0,
  })) as UserAdminProfile[];
};
