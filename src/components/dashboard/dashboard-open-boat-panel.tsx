import Link from "next/link";

import {
  deleteSeason,
  deleteTripSegment,
  deleteVisit,
  saveSeason,
  saveTripSegment,
  saveVisit,
} from "@/app/boats/[boatId]/actions";
import { DashboardOpenBoatSwitcher } from "@/components/dashboard/dashboard-open-boat-switcher";
import { RoutePrefetcher } from "@/components/layout/route-prefetcher";
import { NextStepCard } from "@/components/planning/next-step-card";
import { SeasonBar } from "@/components/planning/season-bar";
import { TripOverview } from "@/components/planning/trip-overview";
import { getDashboardBoatWorkspace } from "@/lib/boat-data";
import { computeVisitConflicts } from "@/lib/planning";
import { t, type Locale } from "@/lib/i18n";
import { startServerTiming } from "@/lib/server-timing";

export async function DashboardOpenBoatPanel({
  boatId,
  locale,
  requestedSeasonId,
}: {
  boatId: string;
  locale: Locale;
  requestedSeasonId?: string;
}) {
  const timing = startServerTiming("dashboard.openBoatPanel", {
    boatId,
    requestedSeasonId: requestedSeasonId ?? null,
  });
  const workspace = await getDashboardBoatWorkspace(boatId, requestedSeasonId);
  const canEdit =
    workspace.viewer.isSuperuser || Boolean(workspace.permission?.can_edit);
  const canShare = canEdit;
  const conflicts = computeVisitConflicts(
    workspace.selectedSeason,
    workspace.tripSegments,
    workspace.visits,
  );
  timing.end({
    seasonId: workspace.selectedSeason?.id ?? null,
    tripSegments: workspace.tripSegments.length,
    visits: workspace.visits.length,
    conflicts: conflicts.length,
  });

  if (!workspace.selectedSeason) {
    return (
      <div className="dashboard-open-boat dashboard-open-boat--ready">
        <NextStepCard
          actionHref={`/boats/${boatId}/trip?setup=create-season`}
          actionLabel={t(locale, "planning.nextStepCreateSeasonAction")}
          body={t(locale, "planning.nextStepCreateSeasonBody")}
          eyebrow={t(locale, "planning.nextStepEyebrow")}
          locale={locale}
          title={t(locale, "planning.nextStepCreateSeasonTitle")}
        />
      </div>
    );
  }

  return (
    <div className="dashboard-open-boat dashboard-open-boat--ready">
      <RoutePrefetcher
        routes={[
          `/boats/${boatId}`,
          `/boats/${boatId}?view=visits${workspace.selectedSeason ? `&season=${workspace.selectedSeason.id}` : ""}`,
          `/boats/${boatId}/share`,
        ]}
      />
      <div className="stack">
        <SeasonBar
          basePath={`/dashboard?boat=${boatId}`}
          boatId={boatId}
          canEdit={canEdit}
          onDelete={deleteSeason}
          onSave={saveSeason}
          seasons={workspace.seasons}
          selected={workspace.selectedSeason}
        />

        <article className="dashboard-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">{workspace.boat.name}</p>
              <h2>{workspace.selectedSeason.name}</h2>
            </div>
            <div className="workspace-header__actions">
              <Link className="secondary-button" href={`/boats/${boatId}/trip`}>
                {t(locale, "boatSelector.openWorkspace")}
              </Link>
            </div>
          </div>
          <div className="boat-card__stats">
            <span>{workspace.tripSegments.length} {t(locale, "boatSelector.tripSegmentsStat")}</span>
            <span>{workspace.visits.length} {t(locale, "boatSelector.visitsStat")}</span>
            <span>{workspace.boat.home_port || t(locale, "boatSelector.homePortMissing")}</span>
          </div>
        </article>

        <TripOverview
          season={workspace.selectedSeason}
          tripSegments={workspace.tripSegments}
          visits={workspace.visits}
        >
          <DashboardOpenBoatSwitcher
            boatId={boatId}
            canEdit={canEdit}
            canShare={canShare}
            conflicts={conflicts}
            onDeleteTripSegment={deleteTripSegment}
            onDeleteVisit={deleteVisit}
            onSaveTripSegment={saveTripSegment}
            onSaveVisit={saveVisit}
            season={workspace.selectedSeason}
            tripSegments={workspace.tripSegments}
            visits={workspace.visits}
          />
        </TripOverview>
      </div>
    </div>
  );
}
