/* eslint-disable @typescript-eslint/no-explicit-any */
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { isLocale, LOCALE_COOKIE_NAME, type Locale } from "@/lib/i18n";

export const getRequestLocale = async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  if (isLocale(cookieLocale)) {
    return cookieLocale;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("preferred_language")
        .eq("id", user.id)
        .maybeSingle();

      if (isLocale(data?.preferred_language)) {
        return data.preferred_language;
      }
    }
  } catch {
    return "es";
  }

  return "es";
};
