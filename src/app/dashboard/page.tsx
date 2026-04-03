import { cookies } from "next/headers";
import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { BoatSelector } from "@/components/boats/boat-selector";
import { LastBoatTracker } from "@/components/boats/last-boat-tracker";
import { TimelineVisibilityPanel } from "@/components/shared/timeline-visibility-panel";
import { getAccessibleBoats, getBoatSelectedSeason, requireViewer } from "@/lib/boat-data";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { getReleaseLabel } from "@/lib/release";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ change?: string; boat?: string }>;
}) {
  const [locale, { viewer }, boats, { change, boat }] = await Promise.all([
    getRequestLocale(),
    requireViewer(),
    getAccessibleBoats(),
    searchParams,
  ]);
  const releaseLabel = getReleaseLabel();

  const cookieStore = await cookies();
  const lastBoatId = cookieStore.get("lastBoatId")?.value;
  const requestedBoatId = boat && boats.some((b) => b.boat_id === boat) ? boat : undefined;
  const activeBoats = boats.filter((b) => b.is_active !== false);
  const selectedBoatId = viewer.isSuperuser
    ? (
        requestedBoatId ??
        (lastBoatId && boats.some((b) => b.boat_id === lastBoatId)
          ? lastBoatId
          : boats[0]?.boat_id)
      )
    : boats[0]?.boat_id;
  const visibleBoats = viewer.isSuperuser
    ? boats
    : boats.filter((boat) => boat.boat_id === selectedBoatId);
  const selectedSeasonData = selectedBoatId ? await getBoatSelectedSeason(selectedBoatId) : null;
  const selectedSeasonLabel = selectedSeasonData?.selectedSeason
    ? selectedSeasonData.selectedSeason.name
    : null;

  return (
    <main className="shell">
      {selectedBoatId ? <LastBoatTracker boatId={selectedBoatId} /> : null}
      <header className="dashboard-header">
        <div>
          <h1>{viewer.isSuperuser ? t(locale, "dashboard.titleAll") : t(locale, "dashboard.titleOwn")}</h1>
          <p className="meta">{releaseLabel}</p>
          {viewer.isSuperuser && (
            <p className="muted">
              {boats.length} {t(locale, "dashboard.boatsCount")} ·{" "}
              {activeBoats.length} {t(locale, "dashboard.activeCount")}
            </p>
          )}
        </div>
        <div className="workspace-header__actions">
          {viewer.isSuperuser && (
            <>
              <Link className="secondary-button" href="/admin/boats">
                {t(locale, "dashboard.manageBoats")}
              </Link>
              <Link className="secondary-button" href="/admin/users">
                {t(locale, "dashboard.manageUsers")}
              </Link>
              <Link className="secondary-button" href="/admin/metrics">
                {t(locale, "dashboard.systemMetrics")}
              </Link>
            </>
          )}
          <LogoutButton />
        </div>
      </header>

      {boats.length ? (
        <section className="admin-stack" style={{ marginTop: "1rem" }}>
          {viewer.isSuperuser && !selectedBoatId ? (
            <article className="dashboard-card">
              <p className="eyebrow">{t(locale, "dashboard.pickBoatTitle")}</p>
              <p className="muted">{t(locale, "dashboard.pickBoatBody")}</p>
            </article>
          ) : null}
          <BoatSelector
            activeBoatId={selectedBoatId}
            boats={visibleBoats}
            collapsible={viewer.isSuperuser && Boolean(selectedBoatId)}
            initiallyExpanded={viewer.isSuperuser && Boolean(change)}
            selectionOnly={viewer.isSuperuser}
            selectionSubtitle={selectedSeasonLabel}
          />
        </section>
      ) : (
        <section className="dashboard-card" style={{ marginTop: "1.5rem" }}>
          <p className="eyebrow">{t(locale, "dashboard.noBoats")}</p>
          <p className="muted">{t(locale, "dashboard.noBoatsBody")}</p>
        </section>
      )}

      <section style={{ marginTop: "1rem" }}>
        <TimelineVisibilityPanel
          actionLabelKey="dashboard.sharedTimelinesAction"
          bodyKey="dashboard.crossBoatVisibilityBody"
          isPublic={Boolean(viewer.profile?.is_timeline_public)}
          isSuperuser={viewer.isSuperuser}
          statusOffKey="dashboard.crossBoatVisibilityOff"
          statusOnKey="dashboard.crossBoatVisibilityOn"
          toggleOffKey="dashboard.crossBoatVisibilityToggleOff"
          toggleOnKey="dashboard.crossBoatVisibilityToggleOn"
          titleKey="dashboard.sharedTimelinesTitle"
        />
      </section>
    </main>
  );
}
