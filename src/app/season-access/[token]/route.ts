import { type NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  SEASON_ACCESS_COOKIE_NAME,
  getSeasonAccessCookieOptions,
  getSeasonAccessErrorUrl,
  hashSeasonAccessToken,
  serializeSeasonAccessCookie,
} from "@/lib/season-access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.redirect(getSeasonAccessErrorUrl("config").toString());
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const tokenHash = hashSeasonAccessToken(token);

  const { data: link, error } = await db
    .from("season_access_links")
    .select("id, boat_id, season_id, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !link) {
    return NextResponse.redirect(getSeasonAccessErrorUrl("not_found").toString());
  }

  if (link.revoked_at || new Date(link.expires_at) <= new Date()) {
    return NextResponse.redirect(getSeasonAccessErrorUrl("expired").toString());
  }

  // Record access async (non-blocking — best-effort)
  void db.rpc("record_season_access_link_hit", { p_link_id: link.id });

  const payload = {
    v: 1 as const,
    linkId: link.id as string,
    boatId: link.boat_id as string,
    seasonId: link.season_id as string,
    expiresAt: link.expires_at as string,
  };

  const cookieValue = serializeSeasonAccessCookie(payload);
  const cookieOptions = getSeasonAccessCookieOptions(link.expires_at as string);

  const destination = new URL(
    `/guest/${link.boat_id}/${link.season_id}`,
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  );

  const response = NextResponse.redirect(destination.toString());
  response.cookies.set(SEASON_ACCESS_COOKIE_NAME, cookieValue, cookieOptions);

  return response;
}
