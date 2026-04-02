import { type NextRequest, NextResponse } from "next/server";

import { resolveAppOrigin } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SEASON_ACCESS_COOKIE_NAME,
  getSeasonAccessCookieOptions,
  getSeasonAccessErrorUrl,
  hashSeasonAccessToken,
  serializeSeasonAccessCookie,
} from "@/lib/season-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const requestOrigin = request.nextUrl.origin;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.redirect(
      getSeasonAccessErrorUrl("config", { requestOrigin }).toString(),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const tokenHash = hashSeasonAccessToken(token);

  const { data: link, error } = await db
    .from("season_access_links")
    .select("id, boat_id, season_id, expires_at, revoked_at, can_view_visits, single_use, redeemed_at, access_count, season:seasons(name), creator:profiles!season_access_links_created_by_user_id_fkey(display_name)")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !link) {
    return NextResponse.redirect(
      getSeasonAccessErrorUrl("not_found", { requestOrigin }).toString(),
    );
  }

  if (
    link.revoked_at ||
    Date.parse(link.expires_at) <= Date.now() ||
    (link.single_use && link.redeemed_at)
  ) {
    return NextResponse.redirect(
      getSeasonAccessErrorUrl("expired", { requestOrigin }).toString(),
    );
  }

  const now = new Date().toISOString();
  const firstAccess = Number(link.access_count ?? 0) === 0;

  let redeemQuery = db
    .from("season_access_links")
    .update({
      access_count: Number(link.access_count ?? 0) + 1,
      last_access_at: now,
      redeemed_at: link.single_use ? now : link.redeemed_at,
    })
    .eq("id", link.id)
    .is("revoked_at", null)
    .gt("expires_at", now);

  if (link.single_use) {
    redeemQuery = redeemQuery.is("redeemed_at", null);
  }

  const { data: redeemedLink, error: redeemError } = await redeemQuery
    .select("id")
    .maybeSingle();

  if (redeemError || !redeemedLink) {
    return NextResponse.redirect(
      getSeasonAccessErrorUrl("expired", { requestOrigin }).toString(),
    );
  }

  const payload = {
    v: 1 as const,
    linkId: link.id as string,
    boatId: link.boat_id as string,
    seasonId: link.season_id as string,
    expiresAt: link.expires_at as string,
  };

  const cookieValue = serializeSeasonAccessCookie(payload);
  const cookieOptions = getSeasonAccessCookieOptions(link.expires_at as string, {
    requestOrigin,
  });

  let destination: URL;
  try {
    destination = new URL(
      `/guest/${link.boat_id}/${link.season_id}`,
      resolveAppOrigin({ requestOrigin }),
    );
  } catch {
    destination = new URL(`/guest/${link.boat_id}/${link.season_id}`, requestOrigin);
  }

  if (firstAccess) {
    destination.searchParams.set("welcome", "1");
  }

  const response = NextResponse.redirect(destination.toString());
  response.cookies.set(SEASON_ACCESS_COOKIE_NAME, cookieValue, cookieOptions);

  return response;
}
