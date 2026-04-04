/* eslint-disable @typescript-eslint/no-explicit-any */

import { cache } from "react";
import { redirect } from "next/navigation";

import { startServerTiming } from "@/lib/server-timing";
import { createClient } from "@/lib/supabase/server";
import type { ViewerContext } from "@/lib/planning";

export const requireViewer = cache(async () => {
  const timing = startServerTiming("boatData.requireViewer");
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const viewer: ViewerContext = {
    profile,
    isSuperuser: Boolean(profile?.is_superuser),
    onboardingPending: Boolean(profile?.onboarding_pending),
    onboardingStep: profile?.onboarding_step ?? null,
    isSeasonGuest: false,
  };

  timing.end({
    userId: user.id,
    isSuperuser: viewer.isSuperuser,
    hasProfile: Boolean(profile),
  });
  return { supabase, user, viewer };
});

export const requireSuperuser = async () => {
  const context = await requireViewer();

  if (!context.viewer.isSuperuser) {
    redirect("/dashboard");
  }

  return context;
};

export const requireUserAdminAccess = cache(async () => {
  const context = await requireViewer();
  const db = context.supabase as any;

  if (context.viewer.isSuperuser) {
    return {
      ...context,
      manageableBoatIds: null as string[] | null,
    };
  }

  const { data, error } = await db
    .from("user_boat_permissions")
    .select("boat_id, permission_level, can_manage_boat_users")
    .eq("user_id", context.user.id)
    .or("can_manage_boat_users.eq.true,permission_level.eq.manager");

  if (error) {
    throw new Error(error.message);
  }

  const manageableBoatIds = Array.from(
    new Set(
      ((data ?? []) as { boat_id: string }[]).map((entry) => entry.boat_id),
    ),
  );

  if (!manageableBoatIds.length) {
    redirect("/dashboard");
  }

  return {
    ...context,
    manageableBoatIds,
  };
});
