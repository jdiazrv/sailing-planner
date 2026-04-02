import { SeasonAccessPanel } from "@/components/admin/season-access-panel";
import { BoatNav } from "@/components/boats/boat-nav";
import { TripOverview } from "@/components/planning/trip-overview";
import { SeasonBar } from "@/components/planning/season-bar";
import { TripSegmentsManager } from "@/components/planning/trip-segments-manager";
import { getBoatWorkspace, getSeasonAccessLinkStatus } from "@/lib/boat-data";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

import {
  deleteSeason,
  deleteTripSegment,
  generateSeasonAccessLink,
  revokeSeasonAccessLink,
  saveSeason,
  saveTripSegment,
} from "../actions";

export default async function BoatTripPage({
  params,
  searchParams,
}: {
  params: Promise<{ boatId: string }>;
  searchParams: Promise<{ season?: string; status?: string }>;
}) {
  const { boatId } = await params;
  const locale = await getRequestLocale();
  const { season: requestedSeasonId, status } = await searchParams;
  const workspace = await getBoatWorkspace(boatId, requestedSeasonId);
  const canEdit =
    workspace.viewer.isSuperuser || Boolean(workspace.permission?.can_edit);
  const canManageUsers =
    workspace.viewer.isSuperuser ||
    Boolean(workspace.permission?.can_manage_boat_users);
  const seasonAccess =
    canManageUsers && workspace.selectedSeason
      ? await getSeasonAccessLinkStatus(boatId, workspace.selectedSeason.id)
      : null;
  const filteredSegments = [...workspace.tripSegments]
    .filter((s) => (status ? s.status === status : true))
    .sort(
      (a, b) =>
        a.start_date.localeCompare(b.start_date) ||
        a.end_date.localeCompare(b.end_date),
    );

  return (
    <>
      {workspace.selectedSeason && (
        <>
          <SeasonBar
            basePath={`/boats/${boatId}/trip`}
            boatId={boatId}
            canEdit={canEdit}
            onDelete={deleteSeason}
            onSave={saveSeason}
            seasons={workspace.seasons}
            selected={workspace.selectedSeason}
          />

          {canManageUsers && seasonAccess ? (
            <SeasonAccessPanel
              boatId={boatId}
              links={seasonAccess.links}
              onGenerate={generateSeasonAccessLink}
              onRevoke={revokeSeasonAccessLink}
              seasonId={workspace.selectedSeason.id}
            />
          ) : null}

          <BoatNav active="trip" boatId={boatId} />

          <TripOverview
            season={workspace.selectedSeason}
            tripSegments={filteredSegments}
            visits={workspace.visits}
          >
            <article className="dashboard-card workspace-main">
              <div className="card-header">
                <div>
                  <p className="eyebrow">{t(locale, "planning.tripSegments")}</p>
                  <h2>{t(locale, "planning.routeBlocks")} — {workspace.selectedSeason.name}</h2>
                </div>
                <form className="inline-filters" method="get">
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
        </>
      )}
    </>
  );
}
