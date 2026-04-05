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

const buildLoginErrorUrl = (
  requestUrl: URL,
  next: string,
  oauthError: string,
  oauthErrorDescription?: string | null,
) => {
  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("next", next);
  loginUrl.searchParams.set("oauth_error", oauthError);
  if (oauthErrorDescription) {
    loginUrl.searchParams.set("oauth_error_description", oauthErrorDescription);
  }

  return loginUrl;
};

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));
  const oauthError = requestUrl.searchParams.get("error");
  const oauthErrorDescription = requestUrl.searchParams.get("error_description");

  if (oauthError) {
    return NextResponse.redirect(
      buildLoginErrorUrl(requestUrl, next, oauthError, oauthErrorDescription),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      buildLoginErrorUrl(
        requestUrl,
        next,
        "missing_code",
        "Provider did not return authorization code",
      ),
    );
  }

  const response = NextResponse.redirect(new URL(next, requestUrl.origin));

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

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(
      buildLoginErrorUrl(
        requestUrl,
        next,
        "exchange_failed",
        exchangeError.message,
      ),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      buildLoginErrorUrl(
        requestUrl,
        next,
        "session_missing",
        "No user returned after OAuth code exchange",
      ),
    );
  }

  const provider =
    user.app_metadata?.provider ??
    user.identities?.[0]?.provider ??
    null;

  // Keep within DB check constraint: password|magic_link|unknown.
  const method: SignInMethod =
    provider === "email"
      ? "magic_link"
      : provider === "google"
        ? "google"
        : "unknown";

  await recordCurrentUserAccess(method);

  return response;
}
