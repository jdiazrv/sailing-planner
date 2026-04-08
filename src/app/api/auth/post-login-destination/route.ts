import { NextResponse, type NextRequest } from "next/server";

import { getSafeNextPath, resolveAuthenticatedDestination } from "@/lib/auth-destination";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { next?: unknown };
  const safeNext = getSafeNextPath(body.next);

  if (safeNext) {
    return NextResponse.json({ destination: safeNext });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const destination = await resolveAuthenticatedDestination({
    supabase,
    user,
    next: safeNext,
    lastBoatId: request.cookies.get("lastBoatId")?.value,
  });

  return NextResponse.json({ destination });
}