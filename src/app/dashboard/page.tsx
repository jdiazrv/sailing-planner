import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BoatSelector } from "@/components/boats/boat-selector";
import { LastBoatTracker } from "@/components/boats/last-boat-tracker";
import { TimelineVisibilityPanel } from "@/components/shared/timeline-visibility-panel";
import {
  getAccessibleBoats,
  getSuperuserDashboardSnapshot,
  requireViewer,
} from "@/lib/boat-data";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { getReleaseLabel } from "@/lib/release";
import { startServerTiming } from "@/lib/server-timing";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ change?: string; boat?: string; season?: string }>;
}) {
  const timing = startServerTiming("dashboard.page");
  const [{ change, boat, season }, locale, viewerContext] = await Promise.all([
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
          requestedSeasonId: season,
          lastBoatId,
        })
      : null;

  const boats = fullBoats ?? superuserSnapshot?.boats ?? [];
  const requestedBoatId = boat && boats.some((b) => b.boat_id === boat) ? boat : undefined;
  const cookieBoatId =
    lastBoatId && boats.some((entry) => entry.boat_id === lastBoatId)
      ? lastBoatId
      : undefined;
  const activeBoatsCount = fullBoats
    ? fullBoats.filter((b) => b.is_active !== false).length
    : (superuserSnapshot?.activeBoats ?? 0);
  const totalBoatsCount = fullBoats?.length ?? superuserSnapshot?.totalBoats ?? boats.length;
  const selectedBoatId = viewer.isSuperuser
    ? (
        requestedBoatId ??
        cookieBoatId ??
        boats[0]?.boat_id
      )
    : boats[0]?.boat_id;
  const selectedBoat = boats.find((entry) => entry.boat_id === selectedBoatId);
  const dashboardTitle =
    selectedBoat?.boat_name ??
    (viewer.isSuperuser && shouldLoadAllBoats
      ? t(locale, "dashboard.titleAll")
      : t(locale, "dashboard.titleOwn"));

  if (viewer.onboardingPending && selectedBoatId) {
    const nextParams = new URLSearchParams();
    if (season) {
      nextParams.set("season", season);
    }
    const nextQuery = nextParams.toString();
    redirect(
      nextQuery
        ? `/boats/${selectedBoatId}?${nextQuery}`
        : `/boats/${selectedBoatId}`,
    );
  }

  if (!viewer.isSuperuser && selectedBoatId) {
    redirect(`/boats/${selectedBoatId}`);
  }

  // Superuser with lastBoatId (no explicit boat requested, not in change mode) → go directly to workspace
  if (viewer.isSuperuser && cookieBoatId && !boat && !change) {
    redirect(`/boats/${cookieBoatId}`);
  }

  const visibleBoats = viewer.isSuperuser && shouldLoadAllBoats
    ? boats
    : boats.filter((entry) => entry.boat_id === selectedBoatId);
  const selectedSeasonLabel = superuserSnapshot?.selectedSeasonName ?? null;

  timing.end({
    isSuperuser: viewer.isSuperuser,
    shouldLoadAllBoats,
    boats: boats.length,
    selectedBoatId,
    hasSeasonLabel: Boolean(selectedSeasonLabel),
  });

  return (
    <>
      {selectedBoatId ? <LastBoatTracker boatId={selectedBoatId} /> : null}
      <header className="dashboard-header">
        <div>
          <h1>{dashboardTitle}</h1>
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
              <Link className="secondary-button sidebar-hidden" href="/admin/boats">
                {t(locale, "dashboard.manageBoats")}
              </Link>
              <Link className="secondary-button sidebar-hidden" href="/admin/users">
                {t(locale, "dashboard.manageUsers")}
              </Link>
              <Link className="secondary-button sidebar-hidden" href="/admin/metrics">
                {t(locale, "dashboard.systemMetrics")}
              </Link>
            </>
          )}
        </div>
      </header>

      {boats.length > 1 ? (
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
      ) : boats.length === 0 ? (
        <section className="dashboard-card" style={{ marginTop: "1.5rem" }}>
          <p className="eyebrow">{t(locale, "dashboard.noBoats")}</p>
          <p className="muted">{t(locale, "dashboard.noBoatsBody")}</p>
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
    </>
  );
}
