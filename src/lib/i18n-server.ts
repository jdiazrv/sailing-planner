/* eslint-disable @typescript-eslint/no-explicit-any */
import { cookies } from "next/headers";

import { requireViewer } from "@/lib/boat-data";
import { isLocale, LOCALE_COOKIE_NAME, type Locale } from "@/lib/i18n";

export const getRequestLocale = async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  if (isLocale(cookieLocale)) {
    return cookieLocale;
  }

  const hasSupabaseSessionCookie = cookieStore
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));

  if (!hasSupabaseSessionCookie) {
    return "es";
  }

  try {
    const { viewer } = await requireViewer();

    if (isLocale(viewer.profile?.preferred_language)) {
      return viewer.profile.preferred_language;
    }
  } catch {
    return "es";
  }

  return "es";
};
