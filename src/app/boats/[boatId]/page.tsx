import { BoatWorkspaceShell } from "@/components/planning/boat-workspace-shell";
import { MemberFirstAccess } from "@/components/guest/member-first-access";
import { NextStepCard } from "@/components/planning/next-step-card";
import { SeasonBar } from "@/components/planning/season-bar";
import { getBoatWorkspace } from "@/lib/boat-data";
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
  const canManageUsers =
    workspace.viewer.isSuperuser ||
    Boolean(workspace.permission?.can_manage_boat_users);
  const canShare = canEdit || canManageUsers;
  const currentView = view === "visits" ? "visits" : "trip";

  return (
    <>
      {workspace.viewer.onboardingPending ? (
        <MemberFirstAccess
          canEditBoat={canEdit}
          canManageUsers={canManageUsers}
          canShare={canShare}
          canViewVisits
          viewerId={`${workspace.viewer.profile?.id ?? boatId}:${workspace.selectedSeason?.id ?? "no-season"}:${currentView}`}
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

      {workspace.selectedSeason ? (
        <BoatWorkspaceShell
          boatId={boatId}
          canEdit={canEdit}
          canShare={canShare}
          initialView={currentView}
          onDeleteTripSegment={deleteTripSegment}
          onDeleteVisit={deleteVisit}
          onSaveTripSegment={saveTripSegment}
          onSaveVisit={saveVisit}
          queryFilter={q}
          season={workspace.selectedSeason}
          seasonId={workspace.selectedSeason.id}
          seasonStart={workspace.selectedSeason.start_date}
          statusFilter={status}
          tripSegments={workspace.tripSegments}
          visits={workspace.visits}
        />
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
