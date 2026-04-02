import { BoatNav } from "@/components/boats/boat-nav";
import { MemberFirstAccess } from "@/components/guest/member-first-access";
import { NextStepCard } from "@/components/planning/next-step-card";
import { SeasonBar } from "@/components/planning/season-bar";
import { VisitsWorkspace } from "@/components/planning/visits-workspace";
import { getBoatWorkspace } from "@/lib/boat-data";
import { computeVisitConflicts } from "@/lib/planning";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

import { deleteSeason, deleteVisit, saveSeason, saveVisit } from "../actions";

export default async function BoatVisitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ boatId: string }>;
  searchParams: Promise<{ season?: string; status?: string; q?: string; setup?: string }>;
}) {
  const { boatId } = await params;
  const locale = await getRequestLocale();
  const { season: requestedSeasonId, status, q, setup } = await searchParams;
  const workspace = await getBoatWorkspace(boatId, requestedSeasonId);
  const canEdit =
    workspace.viewer.isSuperuser || Boolean(workspace.permission?.can_edit);
  const canShare = canEdit;
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
        basePath={`/boats/${boatId}/visits`}
        boatId={boatId}
        canEdit={canEdit}
        initiallyOpenAdd={setup === "create-season"}
        onDelete={deleteSeason}
        onSave={saveSeason}
        seasons={workspace.seasons}
        selected={workspace.selectedSeason}
      />

      <BoatNav active="visits" boatId={boatId} canShare={canShare} />

      {workspace.selectedSeason ? (
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
      ) : (
        <NextStepCard
          actionHref={`/boats/${boatId}/visits?setup=create-season`}
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
