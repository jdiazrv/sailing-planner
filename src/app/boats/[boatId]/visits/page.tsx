import { BoatNav } from "@/components/boats/boat-nav";
import { SeasonBar } from "@/components/planning/season-bar";
import { VisitsWorkspace } from "@/components/planning/visits-workspace";
import { getBoatWorkspace } from "@/lib/boat-data";
import { computeVisitConflicts } from "@/lib/planning";

import { deleteSeason, deleteVisit, saveSeason, saveVisit } from "../actions";

export default async function BoatVisitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ boatId: string }>;
  searchParams: Promise<{ season?: string; status?: string; q?: string }>;
}) {
  const { boatId } = await params;
  const { season: requestedSeasonId, status, q } = await searchParams;
  const workspace = await getBoatWorkspace(boatId, requestedSeasonId);
  const canEdit =
    workspace.viewer.isSuperuser || Boolean(workspace.permission?.can_edit);
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
      <SeasonBar
        basePath={`/boats/${boatId}/visits`}
        boatId={boatId}
        canEdit={canEdit}
        onDelete={deleteSeason}
        onSave={saveSeason}
        seasons={workspace.seasons}
        selected={workspace.selectedSeason}
      />

      <BoatNav active="visits" boatId={boatId} />

      <VisitsWorkspace
        boatId={boatId}
        canEdit={canEdit}
        conflicts={conflicts}
        onDelete={deleteVisit}
        onSave={saveVisit}
        queryFilter={q}
        season={workspace.selectedSeason}
        seasonId={workspace.selectedSeason?.id ?? null}
        seasonStart={workspace.selectedSeason?.start_date ?? ""}
        statusFilter={status}
        tripSegments={workspace.tripSegments}
        visits={filteredVisits}
      />
    </>
  );
}
