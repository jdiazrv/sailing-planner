"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  isLocale,
  LOCALE_COOKIE_NAME,
  type Locale,
} from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export async function updateLanguagePreference(locale: Locale) {
  if (!isLocale(locale)) {
    throw new Error("Invalid locale.");
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await (supabase as any)
      .from("profiles")
      .update({ preferred_language: locale })
      .eq("id", user.id);
  }

  revalidatePath("/", "layout");
}
