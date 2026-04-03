import Link from "next/link";

import { NextStepCard } from "@/components/planning/next-step-card";
import { TripOverview } from "@/components/planning/trip-overview";
import { getDashboardBoatWorkspace } from "@/lib/boat-data";
import { t, type Locale } from "@/lib/i18n";

export async function DashboardOpenBoatPanel({
  boatId,
  locale,
}: {
  boatId: string;
  locale: Locale;
}) {
  const workspace = await getDashboardBoatWorkspace(boatId);

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
      <TripOverview
        season={workspace.selectedSeason}
        tripSegments={workspace.tripSegments}
        visits={workspace.visits}
      >
        <article className="dashboard-card workspace-main">
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
      </TripOverview>
    </div>
  );
}
