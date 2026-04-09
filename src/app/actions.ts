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
import {
  asOptionalString,
  resolveVisitPanelDisplayMode,
  throwIfError,
} from "@/lib/server-action-helpers";
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
}

export async function saveOwnUserSettings(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required.");
  }

  const locale = formData.get("preferred_language")?.toString() ?? "es";
  if (!isLocale(locale)) {
    throw new Error("Invalid locale.");
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
  });

  const { error } = await (supabase as any)
    .from("profiles")
    .update({
      display_name: asOptionalString(formData.get("display_name")),
      is_timeline_public: formData.get("is_timeline_public") === "on",
      preferred_language: locale,
      visit_panel_display_mode: resolveVisitPanelDisplayMode(
        formData.get("visit_panel_display_mode"),
      ),
    })
    .eq("id", user.id);
  throwIfError(error);

  revalidatePath("/account");
  revalidatePath("/dashboard");
  revalidatePath("/shared");
  revalidatePath("/", "layout");
}

export async function updateOwnPassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required.");
  }

  const password = formData.get("password")?.toString() ?? "";
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const { error } = await supabase.auth.updateUser({ password });
  throwIfError(error);
}

export async function recordCurrentUserAccess(
  method?: "password" | "magic_link" | "unknown",
  accessToken?: string,
) {
  await recordCurrentUserAccessInternal(method, accessToken);

  if (method && method !== "unknown") {
    revalidatePath("/dashboard");
    revalidatePath("/admin/users");
  }
}
