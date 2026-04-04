import { NextResponse } from "next/server";

import { recordCurrentUserAccess } from "@/lib/auth-audit";
import { createClient } from "@/lib/supabase/server";
import type { SignInMethod } from "@/types/database";

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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const provider =
      user?.app_metadata?.provider ??
      user?.identities?.[0]?.provider ??
      null;

    // Keep within DB check constraint: password|magic_link|unknown.
    const method: SignInMethod =
      provider === "email"
        ? "magic_link"
        : provider === "google"
          ? "google"
          : "unknown";

    await recordCurrentUserAccess(method);
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
