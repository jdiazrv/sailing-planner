import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { AdminNav } from "@/components/admin/admin-nav";
import { MetricsDashboard } from "@/components/admin/metrics-dashboard";
import {
  getSystemMetrics,
  getApiUsageStats,
  getSupabaseUsageMetrics,
  getUserActivityReport,
  getInviteLinksReport,
} from "@/lib/boat-data";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

import { purgeExpiredAccessLinks } from "./actions";

export default async function AdminMetricsPage() {
  const locale = await getRequestLocale();

  const [metrics, apiUsage, supabaseUsage, users, inviteLinks] = await Promise.all([
    getSystemMetrics(),
    getApiUsageStats(),
    getSupabaseUsageMetrics(),
    getUserActivityReport(),
    getInviteLinksReport(),
  ]);

  return (
    <main className="shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">{t(locale, "metrics.eyebrow")}</p>
          <h1>{t(locale, "metrics.title")}</h1>
          <p className="muted">{t(locale, "metrics.subtitle")}</p>
        </div>
        <div className="workspace-header__actions">
          <Link className="secondary-button" href="/dashboard?change=1">
            {t(locale, "common.dashboard")}
          </Link>
          <LogoutButton />
        </div>
      </header>

      <AdminNav active="metrics" />

      <MetricsDashboard
        apiUsage={apiUsage}
        inviteLinks={inviteLinks}
        locale={locale}
        metrics={metrics}
        onPurgeExpiredLinks={purgeExpiredAccessLinks}
        supabaseUsage={supabaseUsage}
        users={users}
      />
    </main>
  );
}
