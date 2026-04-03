import { MetricsDashboard } from "@/components/admin/metrics-dashboard";
import {
  getSystemMetrics,
  getApiUsageStats,
  getSupabaseUsageMetrics,
  getUserActivityReport,
  getInviteLinksReport,
  requireSuperuser,
} from "@/lib/boat-data";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

import { purgeExpiredAccessLinks } from "./actions";

export default async function AdminMetricsPage() {
  const locale = await getRequestLocale();
  const [, metrics, apiUsage, supabaseUsage, users, inviteLinks] =
    await Promise.all([
      requireSuperuser(),
      getSystemMetrics(),
      getApiUsageStats(),
      getSupabaseUsageMetrics(),
      getUserActivityReport(),
      getInviteLinksReport(),
    ]);

  return (
    <>
      <header className="workspace-header">
        <div>
          <p className="eyebrow">{t(locale, "metrics.eyebrow")}</p>
          <h1>{t(locale, "metrics.title")}</h1>
          <p className="muted">{t(locale, "metrics.subtitle")}</p>
        </div>
      </header>

      <MetricsDashboard
        apiUsage={apiUsage}
        inviteLinks={inviteLinks}
        locale={locale}
        metrics={metrics}
        onPurgeExpiredLinks={purgeExpiredAccessLinks}
        supabaseUsage={supabaseUsage}
        users={users}
      />
    </>
  );
}
