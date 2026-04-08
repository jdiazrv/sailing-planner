import { BoatNav } from "@/components/boats/boat-nav";
import { BoatSeasonSummary } from "@/components/planning/boat-season-summary";
import { NextStepCard } from "@/components/planning/next-step-card";
import { SeasonBar } from "@/components/planning/season-bar";
import { getBoatWorkspace } from "@/lib/boat-data";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

import { deleteSeason, saveSeason } from "../actions";

export default async function BoatSummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ boatId: string }>;
  searchParams: Promise<{ season?: string; setup?: string }>;
}) {
  const { boatId } = await params;
  const locale = await getRequestLocale();
  const { season: requestedSeasonId, setup } = await searchParams;
  const workspace = await getBoatWorkspace(boatId, requestedSeasonId);
  const canEdit =
    workspace.viewer.isSuperuser ||
    Boolean(
      workspace.permission?.can_edit ||
      workspace.permission?.permission_level === "manager",
    );
  const canManageUsers =
    workspace.viewer.isSuperuser ||
    Boolean(
      workspace.permission?.can_manage_boat_users ||
      workspace.permission?.permission_level === "manager",
    );
  const canViewVisits =
    canEdit ||
    workspace.viewer.isSuperuser ||
    Boolean(
      workspace.permission?.can_view_all_visits ||
      workspace.permission?.can_view_only_own_visit,
    );
  const canShare = canEdit || canManageUsers;

  return (
    <>
      <SeasonBar
        basePath={`/boats/${boatId}/summary`}
        boatId={boatId}
        canEdit={canEdit}
        initiallyOpenAdd={setup === "create-season"}
        onDelete={deleteSeason}
        onSave={saveSeason}
        seasons={workspace.seasons}
        selected={workspace.selectedSeason}
      />

      <BoatNav
        active="summary"
        boatId={boatId}
        canShare={canShare}
        canViewVisits={canViewVisits}
      />

      {workspace.selectedSeason ? (
        <BoatSeasonSummary
          canViewVisits={canViewVisits}
          locale={locale}
          season={workspace.selectedSeason}
          tripSegments={workspace.tripSegments}
          visits={workspace.visits}
        />
      ) : (
        <NextStepCard
          actionHref={`/boats/${boatId}/summary?setup=create-season`}
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