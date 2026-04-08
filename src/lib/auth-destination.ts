import type { User } from "@supabase/supabase-js";

import { getAccessibleBoatBase } from "@/lib/boat-data-core";
import type { ProfileRow, ViewerContext } from "@/lib/planning";
import { createClient } from "@/lib/supabase/server";

export const getSafeNextPath = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
};

export const resolveAuthenticatedDestination = async ({
  supabase,
  user,
  next,
  lastBoatId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
  next?: string | null;
  lastBoatId?: string | null;
}) => {
  const safeNext = getSafeNextPath(next);

  if (safeNext) {
    return safeNext;
  }

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const profile = (data ?? null) as ProfileRow | null;

  const viewer: ViewerContext = {
    profile,
    isSuperuser: Boolean(profile?.is_superuser),
    onboardingPending: Boolean(profile?.onboarding_pending),
    onboardingStep: profile?.onboarding_step ?? null,
    isSeasonGuest: false,
  };

  const boats = await getAccessibleBoatBase(supabase, viewer);
  const rememberedBoatId =
    lastBoatId && boats.some((entry) => entry.boat_id === lastBoatId)
      ? lastBoatId
      : undefined;

  if (!viewer.isSuperuser) {
    const destinationBoatId = boats[0]?.boat_id;
    return destinationBoatId ? `/boats/${destinationBoatId}` : "/dashboard";
  }

  if (viewer.onboardingPending) {
    const destinationBoatId = rememberedBoatId ?? boats[0]?.boat_id;
    return destinationBoatId ? `/boats/${destinationBoatId}` : "/dashboard";
  }

  if (rememberedBoatId) {
    return `/boats/${rememberedBoatId}`;
  }

  return "/dashboard";
};