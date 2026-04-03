/* eslint-disable @typescript-eslint/no-explicit-any */

import { getEnv } from "@/lib/env";

import { requireSuperuser } from "@/lib/boat-data-viewer";

export type SystemMetrics = {
  activeUsers30d: number;
  neverSignedIn: number;
  activeBoats: number;
  totalBoats: number;
  liveInviteLinks: number;
  guestAccessesThisMonth: number;
  onboardingPending: number;
  expiredLinksCount: number;
  boatsNoUsersCount: number;
};

export type ApiUsageStat = {
  service: string;
  sku: string;
  eventsThisMonth: number;
};

export type UserActivityRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  sign_in_count: number;
  last_sign_in_at: string | null;
  last_sign_in_method: string | null;
  boats_count: number;
  created_at: string | null;
};

export type InviteLinkRow = {
  id: string;
  invitee_name: string | null;
  boat_name: string | null;
  season_name: string | null;
  expires_at: string;
  access_count: number;
  last_access_at: string | null;
  revoked_at: string | null;
  redeemed_at: string | null;
  single_use: boolean;
  created_at: string;
};

export type SupabaseUsageMetrics = {
  databaseSizeBytes: number | null;
  storageSizeBytes: number | null;
  monthlyActiveUsers: number;
  totalApiRequests: number | null;
  authApiRequests: number | null;
  restApiRequests: number | null;
  storageApiRequests: number | null;
  realtimeApiRequests: number | null;
  egressBytes: number | null;
  hasManagementApi: boolean;
};

const parseMetricNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const getSupabaseProjectRef = () => {
  const env = getEnv();

  if (env.SUPABASE_PROJECT_REF) {
    return env.SUPABASE_PROJECT_REF;
  }

  try {
    const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
    return url.hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
};

const fetchSupabaseAnalytics = async (endpoint: string) => {
  const env = getEnv();
  const projectRef = getSupabaseProjectRef();

  if (!env.SUPABASE_MANAGEMENT_API_KEY || !projectRef) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/analytics/endpoints/${endpoint}`,
      {
        headers: {
          Authorization: `Bearer ${env.SUPABASE_MANAGEMENT_API_KEY}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
};

const getAnalyticsRows = (payload: unknown) => {
  if (Array.isArray(payload)) {
    return payload as Record<string, unknown>[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { result?: unknown }).result)
  ) {
    return (payload as { result: Record<string, unknown>[] }).result;
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: Record<string, unknown>[] }).data;
  }

  return [];
};

const getMetricFromRow = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = parseMetricNumber(row[key]);
    if (value !== null) {
      return value;
    }
  }

  return 0;
};

export const getSystemMetrics = async (): Promise<SystemMetrics> => {
  const { supabase } = await requireSuperuser();
  const db = supabase as any;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { data: profilesData },
    { data: boatsData },
    { data: liveLinksData },
    { data: guestAccessData },
    { data: boatUsersData },
  ] = await Promise.all([
    db.from("profiles").select("id, sign_in_count, last_sign_in_at, onboarding_pending"),
    db.from("boats").select("id, is_active"),
    db
      .from("season_access_links")
      .select("id")
      .gt("expires_at", now.toISOString())
      .is("revoked_at", null),
    db
      .from("season_access_links")
      .select("access_count")
      .gte("created_at", monthStart),
    db.from("user_boat_permissions").select("boat_id"),
  ]);

  const profiles = (profilesData ?? []) as {
    id: string;
    sign_in_count: number | null;
    last_sign_in_at: string | null;
    onboarding_pending: boolean | null;
  }[];
  const boats = (boatsData ?? []) as { id: string; is_active: boolean | null }[];

  const activeUsers30d = profiles.filter(
    (p) => p.last_sign_in_at && p.last_sign_in_at >= thirtyDaysAgo,
  ).length;
  const neverSignedIn = profiles.filter((p) => !p.sign_in_count || p.sign_in_count === 0).length;
  const onboardingPending = profiles.filter((p) => p.onboarding_pending).length;
  const activeBoats = boats.filter((b) => b.is_active !== false).length;

  const boatsWithUsers = new Set(
    ((boatUsersData ?? []) as { boat_id: string }[]).map((r) => r.boat_id),
  );
  const boatsNoUsersCount = boats.filter(
    (b) => b.is_active !== false && !boatsWithUsers.has(b.id),
  ).length;

  const guestAccessesThisMonth = ((guestAccessData ?? []) as { access_count: number }[]).reduce(
    (sum, r) => sum + (r.access_count ?? 0),
    0,
  );

  const { count: expiredLinksCount } = await db
    .from("season_access_links")
    .select("id", { count: "exact", head: true })
    .lt("expires_at", now.toISOString());

  return {
    activeUsers30d,
    neverSignedIn,
    activeBoats,
    totalBoats: boats.length,
    liveInviteLinks: (liveLinksData ?? []).length,
    guestAccessesThisMonth,
    onboardingPending,
    expiredLinksCount: expiredLinksCount ?? 0,
    boatsNoUsersCount,
  };
};

export const getApiUsageStats = async (): Promise<ApiUsageStat[]> => {
  const { supabase } = await requireSuperuser();
  const db = supabase as any;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  const { data, error } = await db
    .from("api_usage_log")
    .select("service, sku, event_count")
    .gte("event_date", monthStart);

  if (error) {
    return [];
  }

  const totals = new Map<string, number>();
  ((data ?? []) as { service: string; sku: string; event_count: number }[]).forEach((row) => {
    const key = `${row.service}::${row.sku}`;
    totals.set(key, (totals.get(key) ?? 0) + row.event_count);
  });

  return Array.from(totals.entries()).map(([key, count]) => {
    const [service, sku] = key.split("::");
    return { service, sku, eventsThisMonth: count };
  });
};

export const getSupabaseUsageMetrics = async (): Promise<SupabaseUsageMetrics> => {
  const { supabase } = await requireSuperuser();
  const db = supabase as any;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [usageSnapshotResult, mauResult, apiCountsPayload, apiRequestsPayload] = await Promise.all([
    db.rpc("get_supabase_plan_usage"),
    db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("last_sign_in_at", thirtyDaysAgo),
    fetchSupabaseAnalytics("usage.api-counts"),
    fetchSupabaseAnalytics("usage.api-requests-count"),
  ]);

  const usageSnapshot =
    ((usageSnapshotResult.data ?? []) as {
      database_size_bytes?: number | string | null;
      storage_size_bytes?: number | string | null;
    }[])[0] ?? null;

  const apiCountsRows = getAnalyticsRows(apiCountsPayload);

  const authApiRequests = apiCountsRows.reduce(
    (sum, row) =>
      sum +
      getMetricFromRow(row, ["auth", "auth_count", "gotrue", "gotrue_count"]),
    0,
  );
  const restApiRequests = apiCountsRows.reduce(
    (sum, row) => sum + getMetricFromRow(row, ["rest", "rest_count", "postgrest", "postgrest_count"]),
    0,
  );
  const storageApiRequests = apiCountsRows.reduce(
    (sum, row) => sum + getMetricFromRow(row, ["storage", "storage_count"]),
    0,
  );
  const realtimeApiRequests = apiCountsRows.reduce(
    (sum, row) => sum + getMetricFromRow(row, ["realtime", "realtime_count"]),
    0,
  );

  const apiRequestRows = getAnalyticsRows(apiRequestsPayload);
  const firstApiRequestRow = apiRequestRows[0] ?? null;
  const totalApiRequests =
    parseMetricNumber(firstApiRequestRow?.count) ??
    parseMetricNumber(firstApiRequestRow?.total) ??
    (apiCountsRows.length
      ? authApiRequests + restApiRequests + storageApiRequests + realtimeApiRequests
      : null);

  return {
    databaseSizeBytes: parseMetricNumber(usageSnapshot?.database_size_bytes),
    storageSizeBytes: parseMetricNumber(usageSnapshot?.storage_size_bytes),
    monthlyActiveUsers: mauResult.count ?? 0,
    totalApiRequests,
    authApiRequests: apiCountsRows.length ? authApiRequests : null,
    restApiRequests: apiCountsRows.length ? restApiRequests : null,
    storageApiRequests: apiCountsRows.length ? storageApiRequests : null,
    realtimeApiRequests: apiCountsRows.length ? realtimeApiRequests : null,
    egressBytes: null,
    hasManagementApi: Boolean(getEnv().SUPABASE_MANAGEMENT_API_KEY),
  };
};

export const getUserActivityReport = async (): Promise<UserActivityRow[]> => {
  const { supabase } = await requireSuperuser();
  const db = supabase as any;

  const [{ data: profilesData }, { data: permissionsData }] = await Promise.all([
    db
      .from("profiles")
      .select("id, display_name, email, sign_in_count, last_sign_in_at, last_sign_in_method, created_at")
      .order("last_sign_in_at", { ascending: true, nullsFirst: true }),
    db.from("user_boat_permissions").select("user_id, boat_id"),
  ]);

  const uniqueBoatsByUser = new Map<string, Set<string>>();
  ((permissionsData ?? []) as { user_id: string; boat_id: string }[]).forEach((row) => {
    const s = uniqueBoatsByUser.get(row.user_id) ?? new Set<string>();
    s.add(row.boat_id);
    uniqueBoatsByUser.set(row.user_id, s);
  });

  return ((profilesData ?? []) as {
    id: string;
    display_name: string | null;
    email: string | null;
    sign_in_count: number | null;
    last_sign_in_at: string | null;
    last_sign_in_method: string | null;
    created_at: string | null;
  }[]).map((p) => ({
    id: p.id,
    display_name: p.display_name,
    email: p.email,
    sign_in_count: p.sign_in_count ?? 0,
    last_sign_in_at: p.last_sign_in_at,
    last_sign_in_method: p.last_sign_in_method,
    boats_count: uniqueBoatsByUser.get(p.id)?.size ?? 0,
    created_at: p.created_at,
  }));
};

export const getInviteLinksReport = async (): Promise<InviteLinkRow[]> => {
  const { supabase } = await requireSuperuser();
  const db = supabase as any;

  const { data, error } = await db
    .from("season_access_links")
    .select(
      "id, invitee_name, expires_at, access_count, last_access_at, revoked_at, redeemed_at, single_use, created_at, boat:boats(name), season:seasons(name, year)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as {
    id: string;
    invitee_name: string | null;
    expires_at: string;
    access_count: number;
    last_access_at: string | null;
    revoked_at: string | null;
    redeemed_at: string | null;
    single_use: boolean;
    created_at: string;
    boat: { name: string } | null;
    season: { name: string | null; year: number } | null;
  }[]).map((row) => ({
    id: row.id,
    invitee_name: row.invitee_name,
    boat_name: row.boat?.name ?? null,
    season_name: row.season?.name ?? (row.season?.year ? String(row.season.year) : null),
    expires_at: row.expires_at,
    access_count: row.access_count ?? 0,
    last_access_at: row.last_access_at,
    revoked_at: row.revoked_at,
    redeemed_at: row.redeemed_at,
    single_use: row.single_use ?? false,
    created_at: row.created_at,
  }));
};
