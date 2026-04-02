"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  isLocale,
  LOCALE_COOKIE_NAME,
  type Locale,
} from "@/lib/i18n";
import { recordCurrentUserAccess as recordCurrentUserAccessInternal } from "@/lib/auth-audit";
import { createClient } from "@/lib/supabase/server";

const throwIfError = (error: { message?: string } | null) => {
  if (error) {
    throw new Error(error.message ?? "Unexpected Supabase error.");
  }
};

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
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ preferred_language: locale })
      .eq("id", user.id);
    throwIfError(error);
  }

  revalidatePath("/", "layout");
}

export async function updateTimelineVisibility(isPublic: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required.");
  }

  const { error } = await (supabase as any)
    .from("profiles")
    .update({ is_timeline_public: isPublic })
    .eq("id", user.id);
  throwIfError(error);

  revalidatePath("/dashboard");
  revalidatePath("/shared");
  revalidatePath("/", "layout");
}

export async function recordCurrentUserAccess() {
  await recordCurrentUserAccessInternal();
  revalidatePath("/dashboard");
  revalidatePath("/admin/users");
}
