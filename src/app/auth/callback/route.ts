import { NextResponse } from "next/server";

import { recordCurrentUserAccess } from "@/lib/auth-audit";
import { createClient } from "@/lib/supabase/server";

const getSafeNextPath = (next: string | null) => {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }

  return next;
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    await recordCurrentUserAccess("magic_link");
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
