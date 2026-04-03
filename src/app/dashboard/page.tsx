import { cookies } from "next/headers";
import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { BoatSelector } from "@/components/boats/boat-selector";
import { LastBoatTracker } from "@/components/boats/last-boat-tracker";
import { TimelineVisibilityPanel } from "@/components/shared/timeline-visibility-panel";
import { NextStepCard } from "@/components/planning/next-step-card";
import { TripOverview } from "@/components/planning/trip-overview";
import {
  getAccessibleBoats,
  getDashboardBoatWorkspace,
  getBoatSelectedSeason,
  getSuperuserDashboardSnapshot,
  requireViewer,
} from "@/lib/boat-data";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { getReleaseLabel } from "@/lib/release";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ change?: string; boat?: string }>;
}) {
  const [{ change, boat }, locale, viewerContext] = await Promise.all([
    searchParams,
    getRequestLocale(),
    requireViewer(),
  ]);
  const releaseLabel = getReleaseLabel();
  const { viewer } = viewerContext;

  const cookieStore = await cookies();
  const lastBoatId = cookieStore.get("lastBoatId")?.value;
  const shouldLoadAllBoats = !viewer.isSuperuser || Boolean(change);
  const fullBoats = shouldLoadAllBoats ? await getAccessibleBoats() : null;
  const superuserSnapshot =
    viewer.isSuperuser && !shouldLoadAllBoats
      ? await getSuperuserDashboardSnapshot({
          requestedBoatId: boat,
          lastBoatId,
        })
      : null;

  const boats = fullBoats ?? superuserSnapshot?.boats ?? [];
  const requestedBoatId = boat && boats.some((b) => b.boat_id === boat) ? boat : undefined;
  const activeBoatsCount = fullBoats
    ? fullBoats.filter((b) => b.is_active !== false).length
    : (superuserSnapshot?.activeBoats ?? 0);
  const totalBoatsCount = fullBoats?.length ?? superuserSnapshot?.totalBoats ?? boats.length;
  const selectedBoatId = viewer.isSuperuser
    ? (
        requestedBoatId ??
        boats[0]?.boat_id
      )
    : boats[0]?.boat_id;
  const visibleBoats = viewer.isSuperuser && shouldLoadAllBoats
    ? boats
    : boats.filter((entry) => entry.boat_id === selectedBoatId);
  const selectedSeasonData = selectedBoatId ? await getBoatSelectedSeason(selectedBoatId) : null;
  const selectedSeasonLabel = selectedSeasonData?.selectedSeason
    ? selectedSeasonData.selectedSeason.name
    : null;
  const dashboardWorkspace = selectedBoatId
    ? await getDashboardBoatWorkspace(selectedBoatId)
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
              {totalBoatsCount} {t(locale, "dashboard.boatsCount")} ·{" "}
              {activeBoatsCount} {t(locale, "dashboard.activeCount")}
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

      {dashboardWorkspace ? (
        <section style={{ marginTop: "1rem" }}>
          {dashboardWorkspace.selectedSeason ? (
            <TripOverview
              season={dashboardWorkspace.selectedSeason}
              tripSegments={dashboardWorkspace.tripSegments}
              visits={dashboardWorkspace.visits}
            >
              <article className="dashboard-card workspace-main">
                <div className="card-header">
                  <div>
                    <p className="eyebrow">{dashboardWorkspace.boat.name}</p>
                    <h2>{selectedSeasonLabel ?? dashboardWorkspace.selectedSeason.name}</h2>
                  </div>
                  <div className="workspace-header__actions">
                    <Link className="secondary-button" href={`/boats/${selectedBoatId}/trip`}>
                      {t(locale, "boatSelector.openWorkspace")}
                    </Link>
                  </div>
                </div>
                <div className="boat-card__stats">
                  <span>{dashboardWorkspace.tripSegments.length} {t(locale, "boatSelector.tripSegmentsStat")}</span>
                  <span>{dashboardWorkspace.visits.length} {t(locale, "boatSelector.visitsStat")}</span>
                  <span>{dashboardWorkspace.boat.home_port || t(locale, "boatSelector.homePortMissing")}</span>
                </div>
              </article>
            </TripOverview>
          ) : (
            <NextStepCard
              actionHref={`/boats/${selectedBoatId}/trip?setup=create-season`}
              actionLabel={t(locale, "planning.nextStepCreateSeasonAction")}
              body={t(locale, "planning.nextStepCreateSeasonBody")}
              eyebrow={t(locale, "planning.nextStepEyebrow")}
              locale={locale}
              title={t(locale, "planning.nextStepCreateSeasonTitle")}
            />
          )}
        </section>
      ) : null}

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
