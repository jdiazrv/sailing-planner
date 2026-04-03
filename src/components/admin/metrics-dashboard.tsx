"use client";

import { useState } from "react";

import { hasGoogleMapsKey } from "@/lib/google-maps";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import type {
  SystemMetrics,
  ApiUsageStat,
  SupabaseUsageMetrics,
  UserActivityRow,
  InviteLinkRow,
} from "@/lib/boat-data";

// Free-tier limits per SKU
const FREE_LIMITS: Record<string, number> = {
  dynamic_maps: 10_000,
  autocomplete_session: 10_000,
  place_details_essentials: 10_000,
  place_details_pro: 5_000,
};

const SKU_LABELS: Record<string, string> = {
  dynamic_maps: "Google Maps — Dynamic Maps",
  autocomplete_session: "Google Places — Autocomplete (session)",
  place_details_essentials: "Google Places — Place Details (essentials)",
  place_details_pro: "Google Places — Place Details (pro)",
};

function formatDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : "es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

function UsageBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color =
    pct >= 90 ? "var(--status-danger)" : pct >= 70 ? "var(--status-warning)" : "var(--accent)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
      <div
        style={{
          flex: 1,
          height: "6px",
          borderRadius: "3px",
          background: "var(--surface-raised)",
          overflow: "hidden",
          minWidth: "80px",
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "3px" }} />
      </div>
      <span className="meta" style={{ flexShrink: 0 }}>
        {pct}%
      </span>
    </div>
  );
}

function getLinkStatus(link: InviteLinkRow, d: ReturnType<typeof getDictionary>) {
  if (link.revoked_at) return { label: d["metrics.linkStatusRevoked"], cls: "badge--danger" };
  if (link.single_use && link.redeemed_at) return { label: d["metrics.linkStatusUsed"], cls: "badge--muted" };
  if (new Date(link.expires_at) < new Date()) return { label: d["metrics.linkStatusExpired"], cls: "badge--warning" };
  return { label: d["metrics.linkStatusActive"], cls: "" };
}

type MetricsDashboardProps = {
  locale: Locale;
  metrics: SystemMetrics;
  apiUsage: ApiUsageStat[];
  supabaseUsage: SupabaseUsageMetrics;
  users: UserActivityRow[];
  inviteLinks: InviteLinkRow[];
  onPurgeExpiredLinks: () => Promise<{ deleted: number }>;
};

export function MetricsDashboard({
  locale,
  metrics,
  apiUsage,
  supabaseUsage,
  users,
  inviteLinks,
  onPurgeExpiredLinks,
}: MetricsDashboardProps) {
  const d = getDictionary(locale);
  const [purgeState, setPurgeState] = useState<"idle" | "confirming" | "running" | "done">("idle");
  const [purgeCount, setPurgeCount] = useState(0);

  const handlePurgeClick = () => {
    if (metrics.expiredLinksCount === 0) return;
    setPurgeState("confirming");
  };

  const handlePurgeConfirm = async () => {
    setPurgeState("running");
    try {
      const result = await onPurgeExpiredLinks();
      setPurgeCount(result.deleted);
      setPurgeState("done");
    } catch {
      setPurgeState("idle");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "1rem" }}>

      {/* ------------------------------------------------------------------ */}
      {/* HEALTH CHECK                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="dashboard-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">{d["metrics.healthTitle"]}</p>
          </div>
        </div>
        <ul className="metrics-health-list">
          <li className={hasGoogleMapsKey ? "is-ok" : "is-warn"}>
            <span className="metrics-health-list__icon">{hasGoogleMapsKey ? "✓" : "✗"}</span>
            <span>{hasGoogleMapsKey ? d["metrics.googleMapsConfigured"] : d["metrics.googleMapsNotConfigured"]}</span>
          </li>
          {metrics.onboardingPending > 0 && (
            <li className="is-warn">
              <span className="metrics-health-list__icon">⚠</span>
              <span>{metrics.onboardingPending} {d["metrics.onboardingPending"]}</span>
            </li>
          )}
          {metrics.expiredLinksCount > 0 && (
            <li className="is-warn">
              <span className="metrics-health-list__icon">⚠</span>
              <span>{metrics.expiredLinksCount} {d["metrics.expiredLinks"]}</span>
            </li>
          )}
          {metrics.boatsNoUsersCount > 0 && (
            <li className="is-warn">
              <span className="metrics-health-list__icon">⚠</span>
              <span>{metrics.boatsNoUsersCount} {d["metrics.boatsNoUsers"]}</span>
            </li>
          )}
          {metrics.onboardingPending === 0 && metrics.expiredLinksCount === 0 && metrics.boatsNoUsersCount === 0 && hasGoogleMapsKey && (
            <li className="is-ok">
              <span className="metrics-health-list__icon">✓</span>
              <span>{locale === "es" ? "Sin alertas activas" : "No active alerts"}</span>
            </li>
          )}
        </ul>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SUMMARY CARDS                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <p className="eyebrow" style={{ marginBottom: "0.75rem" }}>{d["metrics.summaryTitle"]}</p>
        <div className="metrics-summary-grid">
          <div className="dashboard-card metrics-stat-card">
            <p className="metrics-stat-card__value">{metrics.activeUsers30d}</p>
            <p className="meta">{d["metrics.activeUsers30d"]}</p>
          </div>
          <div className="dashboard-card metrics-stat-card">
            <p className="metrics-stat-card__value">{metrics.neverSignedIn}</p>
            <p className="meta">{d["metrics.neverSignedIn"]}</p>
          </div>
          <div className="dashboard-card metrics-stat-card">
            <p className="metrics-stat-card__value">{metrics.activeBoats} / {metrics.totalBoats}</p>
            <p className="meta">{d["metrics.activeBoats"]}</p>
          </div>
          <div className="dashboard-card metrics-stat-card">
            <p className="metrics-stat-card__value">{metrics.liveInviteLinks}</p>
            <p className="meta">{d["metrics.liveInviteLinks"]}</p>
          </div>
          <div className="dashboard-card metrics-stat-card">
            <p className="metrics-stat-card__value">{metrics.guestAccessesThisMonth}</p>
            <p className="meta">{d["metrics.guestAccessesMonth"]}</p>
          </div>
          <div className="dashboard-card metrics-stat-card">
            <p className="metrics-stat-card__value">{metrics.onboardingPending}</p>
            <p className="meta">{d["metrics.onboardingPendingCount"]}</p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SUPABASE USAGE                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="dashboard-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">{d["metrics.supabaseTitle"]}</p>
            <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.2rem" }}>
              {d["metrics.supabaseSubtitle"]}
            </p>
          </div>
        </div>

        <div className="metrics-summary-grid">
          <div className="dashboard-card metrics-stat-card">
            <p className="metrics-stat-card__value">
              {supabaseUsage.databaseSizeBytes === null
                ? "—"
                : formatBytes(supabaseUsage.databaseSizeBytes)}
            </p>
            <p className="meta">{d["metrics.supabaseDbSize"]}</p>
          </div>
          <div className="dashboard-card metrics-stat-card">
            <p className="metrics-stat-card__value">
              {supabaseUsage.storageSizeBytes === null
                ? "—"
                : formatBytes(supabaseUsage.storageSizeBytes)}
            </p>
            <p className="meta">{d["metrics.supabaseStorageSize"]}</p>
          </div>
          <div className="dashboard-card metrics-stat-card">
            <p className="metrics-stat-card__value">
              {supabaseUsage.monthlyActiveUsers.toLocaleString()}
            </p>
            <p className="meta">{d["metrics.supabaseMau"]}</p>
          </div>
          <div className="dashboard-card metrics-stat-card">
            <p className="metrics-stat-card__value">
              {supabaseUsage.totalApiRequests === null
                ? "—"
                : supabaseUsage.totalApiRequests.toLocaleString()}
            </p>
            <p className="meta">{d["metrics.supabaseApiRequests"]}</p>
          </div>
        </div>

        <div className="metrics-table-wrap" style={{ marginTop: "1rem" }}>
          <table className="metrics-table">
            <thead>
              <tr>
                <th>{d["metrics.apiService"]}</th>
                <th style={{ textAlign: "right" }}>{d["metrics.apiCount"]}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{d["metrics.supabaseAuthRequests"]}</td>
                <td style={{ textAlign: "right" }}>
                  {supabaseUsage.authApiRequests === null ? "—" : supabaseUsage.authApiRequests.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td>{d["metrics.supabaseRestRequests"]}</td>
                <td style={{ textAlign: "right" }}>
                  {supabaseUsage.restApiRequests === null ? "—" : supabaseUsage.restApiRequests.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td>{d["metrics.supabaseStorageRequests"]}</td>
                <td style={{ textAlign: "right" }}>
                  {supabaseUsage.storageApiRequests === null ? "—" : supabaseUsage.storageApiRequests.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td>{d["metrics.supabaseRealtimeRequests"]}</td>
                <td style={{ textAlign: "right" }}>
                  {supabaseUsage.realtimeApiRequests === null ? "—" : supabaseUsage.realtimeApiRequests.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {!supabaseUsage.hasManagementApi && (
          <p className="muted" style={{ fontSize: "0.75rem", marginTop: "0.75rem" }}>
            {d["metrics.supabaseNotAvailable"]}
          </p>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* GOOGLE API USAGE                                                     */}
      {/* ------------------------------------------------------------------ */}
      <section className="dashboard-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">{d["metrics.apiUsageTitle"]}</p>
            <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.2rem" }}>
              {d["metrics.apiUsageSubtitle"]}
            </p>
          </div>
        </div>

        {apiUsage.length === 0 ? (
          <p className="muted">{d["metrics.noData"]}</p>
        ) : (
          <div className="metrics-table-wrap">
            <table className="metrics-table">
              <thead>
                <tr>
                  <th>{d["metrics.apiService"]}</th>
                  <th style={{ textAlign: "right" }}>{d["metrics.apiCount"]}</th>
                  <th style={{ textAlign: "right" }}>{d["metrics.apiLimit"]}</th>
                  <th style={{ minWidth: "140px" }}>{d["metrics.apiUsage"]}</th>
                </tr>
              </thead>
              <tbody>
                {apiUsage.map((row) => {
                  const limit = FREE_LIMITS[row.sku] ?? null;
                  return (
                    <tr key={`${row.service}::${row.sku}`}>
                      <td>{SKU_LABELS[row.sku] ?? `${row.service} / ${row.sku}`}</td>
                      <td style={{ textAlign: "right" }}>{row.eventsThisMonth.toLocaleString()}</td>
                      <td style={{ textAlign: "right" }}>{limit ? limit.toLocaleString() : "—"}</td>
                      <td>{limit ? <UsageBar value={row.eventsThisMonth} max={limit} /> : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Static free-limit reference for SKUs not yet reached */}
        {apiUsage.length > 0 && (
          <p className="muted" style={{ fontSize: "0.75rem", marginTop: "0.75rem" }}>
            {locale === "es"
              ? "Límites free (marzo 2025): Dynamic Maps 10.000/mes · Autocomplete 10.000 sesiones/mes · Place Details 10.000/mes"
              : "Free limits (March 2025): Dynamic Maps 10,000/mo · Autocomplete 10,000 sessions/mo · Place Details 10,000/mo"}
          </p>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* USER ACTIVITY                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className="dashboard-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">{d["metrics.activityTitle"]}</p>
            <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.2rem" }}>
              {d["metrics.activitySubtitle"]}
            </p>
          </div>
        </div>
        <div className="metrics-table-wrap">
          <table className="metrics-table">
            <thead>
              <tr>
                <th>{d["metrics.userDisplayName"]}</th>
                <th>{d["metrics.userEmail"]}</th>
                <th style={{ textAlign: "right" }}>{d["metrics.userSignIns"]}</th>
                <th>{d["metrics.userLastAccess"]}</th>
                <th>{d["metrics.userMethod"]}</th>
                <th style={{ textAlign: "right" }}>{d["metrics.userBoats"]}</th>
                <th>{d["metrics.userCreated"]}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.display_name ?? <span className="muted">—</span>}</td>
                  <td className="meta">{user.email ?? "—"}</td>
                  <td style={{ textAlign: "right" }}>{user.sign_in_count}</td>
                  <td className="meta">
                    {user.last_sign_in_at
                      ? formatDate(user.last_sign_in_at, locale)
                      : <span className="muted">{d["metrics.userNeverSignedIn"]}</span>}
                  </td>
                  <td className="meta">{user.last_sign_in_method ?? "—"}</td>
                  <td style={{ textAlign: "right" }}>{user.boats_count}</td>
                  <td className="meta">{formatDate(user.created_at, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* INVITE LINKS                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="dashboard-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">{d["metrics.inviteLinksTitle"]}</p>
            <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.2rem" }}>
              {d["metrics.inviteLinksSubtitle"]}
            </p>
          </div>
        </div>
        {inviteLinks.length === 0 ? (
          <p className="muted">{d["metrics.noData"]}</p>
        ) : (
          <div className="metrics-table-wrap">
            <table className="metrics-table">
              <thead>
                <tr>
                  <th>{d["metrics.linkStatus"]}</th>
                  <th>{d["metrics.linkInvitee"]}</th>
                  <th>{d["metrics.linkBoat"]}</th>
                  <th>{d["metrics.linkSeason"]}</th>
                  <th>{d["metrics.linkExpires"]}</th>
                  <th style={{ textAlign: "right" }}>{d["metrics.linkAccesses"]}</th>
                  <th>{d["metrics.linkLastAccess"]}</th>
                </tr>
              </thead>
              <tbody>
                {inviteLinks.map((link) => {
                  const status = getLinkStatus(link, d);
                  return (
                    <tr key={link.id}>
                      <td>
                        <span className={`badge ${status.cls}`}>{status.label}</span>
                      </td>
                      <td>{link.invitee_name ?? <span className="muted">—</span>}</td>
                      <td className="meta">{link.boat_name ?? "—"}</td>
                      <td className="meta">{link.season_name ?? "—"}</td>
                      <td className="meta">{formatDate(link.expires_at, locale)}</td>
                      <td style={{ textAlign: "right" }}>{link.access_count}</td>
                      <td className="meta">
                        {link.last_access_at
                          ? formatDate(link.last_access_at, locale)
                          : <span className="muted">{d["metrics.never"]}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CLEANUP                                                              */}
      {/* ------------------------------------------------------------------ */}
      <section className="dashboard-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">{d["metrics.cleanupTitle"]}</p>
            <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.2rem" }}>
              {d["metrics.cleanupSubtitle"]}
            </p>
          </div>
        </div>

        <div className="metrics-cleanup-row">
          <div>
            <p style={{ fontWeight: 500 }}>{d["metrics.purgeExpiredLinks"]}</p>
            <p className="muted" style={{ fontSize: "0.8rem" }}>{d["metrics.purgeExpiredLinksDesc"]}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
            {purgeState === "done" ? (
              <p className="feedback feedback--success">
                {d["metrics.purgeExpiredLinksDone"].replace("{count}", String(purgeCount))}
              </p>
            ) : purgeState === "confirming" ? (
              <>
                <p className="muted" style={{ fontSize: "0.85rem" }}>
                  {d["metrics.purgeExpiredLinksConfirm"].replace("{count}", String(metrics.expiredLinksCount))}
                </p>
                <button
                  className="danger-button"
                  disabled={purgeState !== "confirming"}
                  onClick={() => void handlePurgeConfirm()}
                  type="button"
                >
                  {locale === "es" ? "Confirmar" : "Confirm"}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => setPurgeState("idle")}
                  type="button"
                >
                  {locale === "es" ? "Cancelar" : "Cancel"}
                </button>
              </>
            ) : (
              <button
                className="secondary-button"
                disabled={metrics.expiredLinksCount === 0 || purgeState === "running"}
                onClick={handlePurgeClick}
                type="button"
                title={
                  metrics.expiredLinksCount === 0
                    ? d["metrics.purgeExpiredLinksNone"]
                    : undefined
                }
              >
                {purgeState === "running"
                  ? (locale === "es" ? "Purgando..." : "Purging...")
                  : `${d["metrics.purgeExpiredLinks"]} (${metrics.expiredLinksCount})`}
              </button>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
