import { redirect } from "next/navigation";

import { SeasonAccessPanel } from "@/components/admin/season-access-panel";
import { BoatNav } from "@/components/boats/boat-nav";
import { NextStepCard } from "@/components/planning/next-step-card";
import { SeasonBar } from "@/components/planning/season-bar";
import { getBoatWorkspace, getSeasonAccessLinkStatus } from "@/lib/boat-data";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

import {
  deleteSeason,
  generateSeasonAccessLink,
  revokeSeasonAccessLink,
  saveSeason,
} from "../actions";

export default async function BoatSharePage({
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
    workspace.viewer.isSuperuser || Boolean(workspace.permission?.can_edit);
  const canManageUsers =
    workspace.viewer.isSuperuser ||
    Boolean(workspace.permission?.can_manage_boat_users);
  const canShare = canEdit || canManageUsers;

  if (!canShare) {
    redirect(`/boats/${boatId}/trip`);
  }

  const seasonAccess = workspace.selectedSeason
    ? await getSeasonAccessLinkStatus(boatId, workspace.selectedSeason.id)
    : null;

  return (
    <>
      <SeasonBar
        basePath={`/boats/${boatId}/share`}
        boatId={boatId}
        canEdit={canEdit}
        initiallyOpenAdd={setup === "create-season"}
        onDelete={deleteSeason}
        onSave={saveSeason}
        seasons={workspace.seasons}
        selected={workspace.selectedSeason}
      />

      <BoatNav active="share" boatId={boatId} canShare />

      {workspace.selectedSeason && seasonAccess ? (
        <SeasonAccessPanel
          boatId={boatId}
          links={seasonAccess.links}
          onGenerate={generateSeasonAccessLink}
          onRevoke={revokeSeasonAccessLink}
          seasonId={workspace.selectedSeason.id}
        />
      ) : (
        <NextStepCard
          actionHref={`/boats/${boatId}/share?setup=create-season`}
          actionLabel={t(locale, "planning.nextStepCreateSeasonAction")}
          body={t(locale, "planning.shareEmptyBody")}
          eyebrow={t(locale, "planning.nextStepEyebrow")}
          locale={locale}
          title={t(locale, "planning.shareEmptyTitle")}
        />
      )}
    </>
  );
}
