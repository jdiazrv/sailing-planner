/* eslint-disable @typescript-eslint/no-explicit-any */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  SEASON_ACCESS_COOKIE_NAME,
  type SeasonAccessCookiePayload,
  getSeasonAccessCookieOptions,
  getSeasonAccessErrorUrl,
  parseSeasonAccessCookie,
  serializeSeasonAccessCookie,
} from "@/lib/season-access";
import type { Database } from "@/types/database";

type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];
type BoatRow = Database["public"]["Tables"]["boats"]["Row"];
type SeasonAccessLinkRow = Database["public"]["Tables"]["season_access_links"]["Row"];

export type SeasonGuestSession = SeasonAccessCookiePayload & {
  link: SeasonAccessLinkRow;
  season: SeasonRow;
  boat: BoatRow;
  creatorName: string | null;
};

export const setSeasonAccessCookie = async (payload: SeasonAccessCookiePayload) => {
  const store = await cookies();
  store.set(
    SEASON_ACCESS_COOKIE_NAME,
    serializeSeasonAccessCookie(payload),
    getSeasonAccessCookieOptions(payload.expiresAt),
  );
};

export const clearSeasonAccessCookie = async () => {
  const store = await cookies();
  store.set(SEASON_ACCESS_COOKIE_NAME, "", {
    ...getSeasonAccessCookieOptions(new Date(0)),
    expires: new Date(0),
  });
};

export const getSeasonAccessCookiePayload = async () => {
  const store = await cookies();
  return parseSeasonAccessCookie(store.get(SEASON_ACCESS_COOKIE_NAME)?.value);
};

export const getSeasonGuestSession = async (
  expectedBoatId?: string,
  expectedSeasonId?: string,
): Promise<SeasonGuestSession | null> => {
  const payload = await getSeasonAccessCookiePayload();

  if (!payload) {
    return null;
  }

  const admin = createAdminClient();
  if (!admin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for season guest access.");
  }

  const db = admin as any;
  const { data: linkData, error } = await db
    .from("season_access_links")
    .select("*, season:seasons(*), boat:boats(*), creator:profiles!season_access_links_created_by_user_id_fkey(display_name)")
    .eq("id", payload.linkId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!linkData) {
    return null;
  }

  const link = linkData as SeasonAccessLinkRow & {
    season: SeasonRow;
    boat: BoatRow;
    creator?: { display_name?: string | null } | null;
  };

  const isExpired = new Date(link.expires_at).getTime() <= Date.now();
  const mismatchedPayload =
    link.boat_id !== payload.boatId ||
    link.season_id !== payload.seasonId ||
    link.expires_at !== payload.expiresAt;

  if (
    link.revoked_at ||
    isExpired ||
    mismatchedPayload ||
    (expectedBoatId && link.boat_id !== expectedBoatId) ||
    (expectedSeasonId && link.season_id !== expectedSeasonId)
  ) {
    return null;
  }

  return {
    ...payload,
    link,
    season: link.season,
    boat: link.boat,
    creatorName: link.creator?.display_name ?? null,
  };
};

export const requireSeasonGuestSession = async (
  expectedBoatId?: string,
  expectedSeasonId?: string,
) => {
  const session = await getSeasonGuestSession(expectedBoatId, expectedSeasonId);

  if (!session) {
    redirect(getSeasonAccessErrorUrl("invalid").toString());
  }

  return session;
};
