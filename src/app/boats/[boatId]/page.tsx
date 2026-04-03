import { BoatNav } from "@/components/boats/boat-nav";
import { MemberFirstAccess } from "@/components/guest/member-first-access";
import { NextStepCard } from "@/components/planning/next-step-card";
import { SeasonBar } from "@/components/planning/season-bar";
import { TripOverview } from "@/components/planning/trip-overview";
import { TripSegmentsManager } from "@/components/planning/trip-segments-manager";
import { VisitsWorkspace } from "@/components/planning/visits-workspace";
import { getBoatWorkspace } from "@/lib/boat-data";
import { computeVisitConflicts } from "@/lib/planning";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

import {
  deleteSeason,
  deleteTripSegment,
  deleteVisit,
  saveSeason,
  saveTripSegment,
  saveVisit,
} from "./actions";

export default async function BoatWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ boatId: string }>;
  searchParams: Promise<{
    view?: string;
    season?: string;
    status?: string;
    q?: string;
    setup?: string;
  }>;
}) {
  const { boatId } = await params;
  const locale = await getRequestLocale();
  const { view, season: requestedSeasonId, status, q, setup } =
    await searchParams;
  const workspace = await getBoatWorkspace(boatId, requestedSeasonId);
  const canEdit =
    workspace.viewer.isSuperuser || Boolean(workspace.permission?.can_edit);
  const canShare = canEdit;
  const currentView = view === "visits" ? "visits" : "trip";
  const filteredSegments = [...workspace.tripSegments]
    .filter((segment) => (status ? segment.status === status : true))
    .sort(
      (left, right) =>
        left.start_date.localeCompare(right.start_date) ||
        left.end_date.localeCompare(right.end_date),
    );
  const query = q?.trim().toLowerCase() ?? "";
  const filteredVisits = workspace.visits.filter((visit) => {
    const matchesStatus = status ? visit.status === status : true;
    const haystack = [
      visit.visitor_name,
      visit.embark_place_label,
      visit.disembark_place_label,
      visit.public_notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return matchesStatus && (!query || haystack.includes(query));
  });
  const conflicts = computeVisitConflicts(
    workspace.selectedSeason,
    workspace.tripSegments,
    workspace.visits,
  );

  return (
    <>
      {!workspace.viewer.isSuperuser && workspace.viewer.onboardingPending ? (
        <MemberFirstAccess
          canViewVisits
          viewerId={workspace.viewer.profile?.id ?? boatId}
        />
      ) : null}

      <SeasonBar
        basePath={`/boats/${boatId}?view=${currentView}`}
        boatId={boatId}
        canEdit={canEdit}
        initiallyOpenAdd={setup === "create-season"}
        onDelete={deleteSeason}
        onSave={saveSeason}
        seasons={workspace.seasons}
        selected={workspace.selectedSeason}
      />

      <BoatNav active={currentView} boatId={boatId} canShare={canShare} />

      {workspace.selectedSeason ? (
        currentView === "trip" ? (
          <TripOverview
            season={workspace.selectedSeason}
            tripSegments={filteredSegments}
            visits={workspace.visits}
          >
            <article className="dashboard-card workspace-main">
              <div className="card-header">
                <div>
                  <p className="eyebrow">{t(locale, "planning.tripSegments")}</p>
                  <h2>
                    {t(locale, "planning.routeBlocks")} -{" "}
                    {workspace.selectedSeason.name}
                  </h2>
                </div>
                <form className="inline-filters" method="get">
                  <input name="view" type="hidden" value="trip" />
                  <input
                    name="season"
                    type="hidden"
                    value={workspace.selectedSeason.id}
                  />
                  <select defaultValue={status ?? ""} name="status">
                    <option value="">{t(locale, "planning.allStatuses")}</option>
                    <option value="tentative">{t(locale, "status.tentative")}</option>
                    <option value="planned">{t(locale, "status.planned")}</option>
                    <option value="confirmed">{t(locale, "status.confirmed")}</option>
                  </select>
                  <button className="link-button" type="submit">
                    {t(locale, "planning.filter")}
                  </button>
                </form>
              </div>

              <TripSegmentsManager
                boatId={boatId}
                canEdit={canEdit}
                onDelete={deleteTripSegment}
                onSave={saveTripSegment}
                seasonId={workspace.selectedSeason.id}
                seasonStart={workspace.selectedSeason.start_date}
                segments={filteredSegments}
              />
            </article>
          </TripOverview>
        ) : (
          <VisitsWorkspace
            boatId={boatId}
            canEdit={canEdit}
            conflicts={conflicts}
            onDelete={deleteVisit}
            onSave={saveVisit}
            queryFilter={q}
            season={workspace.selectedSeason}
            seasonId={workspace.selectedSeason.id}
            seasonStart={workspace.selectedSeason.start_date}
            statusFilter={status}
            tripSegments={workspace.tripSegments}
            visits={filteredVisits}
          />
        )
      ) : (
        <NextStepCard
          actionHref={`/boats/${boatId}?view=${currentView}&setup=create-season`}
          actionLabel={t(locale, "planning.nextStepCreateSeasonAction")}
          body={t(locale, "planning.nextStepCreateSeasonBody")}
          eyebrow={t(locale, "planning.nextStepEyebrow")}
          locale={locale}
          title={t(locale, "planning.nextStepCreateSeasonTitle")}
        />
      )}
    </>
  );
}
