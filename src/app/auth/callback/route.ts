import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { recordCurrentUserAccess } from "@/lib/auth-audit";
import { getEnv } from "@/lib/env";
import type { Database } from "@/types/database";
import type { SignInMethod } from "@/types/database";

const getSafeNextPath = (next: string | null) => {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }

  return next;
};

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));
  const response = NextResponse.redirect(new URL(next, requestUrl.origin));

  if (code) {
    const env = getEnv();
    const supabase = createServerClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

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

  return response;
}
