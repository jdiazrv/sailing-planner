import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { getEnv } from "@/lib/env";
import type { Database } from "@/types/database";

type CookieMutation = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

const isSupportedType = (value: string | null): value is EmailOtpType =>
  value === "invite" || value === "recovery";

const getSafeRedirectPath = (requestUrl: URL, redirectTo: string | null) => {
  if (!redirectTo) {
    return "/auth/set-password";
  }

  try {
    const resolvedUrl = new URL(redirectTo, requestUrl.origin);
    if (resolvedUrl.origin !== requestUrl.origin) {
      return "/auth/set-password";
    }

    return `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
  } catch {
    return "/auth/set-password";
  }
};

const buildErrorUrl = (
  requestUrl: URL,
  tokenHash: string | null,
  type: string | null,
  redirectTo: string | null,
  error: string,
) => {
  const url = new URL("/auth/accept-invite", requestUrl.origin);
  url.searchParams.set("error", error);
  if (tokenHash) {
    url.searchParams.set("token_hash", tokenHash);
  }
  if (type) {
    url.searchParams.set("type", type);
  }
  if (redirectTo) {
    url.searchParams.set("redirect_to", redirectTo);
  }

  return url;
};

export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const formData = await request.formData();
  const tokenHash = formData.get("token_hash")?.toString() ?? null;
  const type = formData.get("type")?.toString() ?? null;
  const redirectTo = formData.get("redirect_to")?.toString() ?? null;

  if (!tokenHash || !isSupportedType(type)) {
    return NextResponse.redirect(
      buildErrorUrl(requestUrl, tokenHash, type, redirectTo, "missing_token"),
    );
  }

  const response = NextResponse.redirect(
    new URL(getSafeRedirectPath(requestUrl, redirectTo), requestUrl.origin),
  );
  const env = getEnv();
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieMutation[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    return NextResponse.redirect(
      buildErrorUrl(requestUrl, tokenHash, type, redirectTo, "invalid_token"),
    );
  }

  return response;
}