"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useI18n } from "@/components/i18n/provider";
import { MapPanel } from "@/components/planning/map-panel";
import { Timeline } from "@/components/planning/timeline";
import { TripSegmentsManager } from "@/components/planning/trip-segments-manager";
import { VisitsManager } from "@/components/planning/visits-manager";
import { computeVisitConflicts, type TripSegmentView, type VisitConflict, type VisitView } from "@/lib/planning";
import type { Database } from "@/types/database";

type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];

type BoatWorkspaceShellProps = {
  boatId: string;
  canEdit: boolean;
  canShare: boolean;
  initialView: "trip" | "visits";
  queryFilter?: string;
  season: SeasonRow;
  seasonId: string;
  seasonStart: string;
  statusFilter?: string;
  tripSegments: TripSegmentView[];
  visits: VisitView[];
  onSaveTripSegment: (fd: FormData) => Promise<void>;
  onDeleteTripSegment: (fd: FormData) => Promise<void>;
  onSaveVisit: (fd: FormData) => Promise<void>;
  onDeleteVisit: (fd: FormData) => Promise<void>;
};

export function BoatWorkspaceShell({
  boatId,
  canEdit,
  canShare,
  initialView,
  queryFilter,
  season,
  seasonId,
  seasonStart,
  statusFilter,
  tripSegments,
  visits,
  onSaveTripSegment,
  onDeleteTripSegment,
  onSaveVisit,
  onDeleteVisit,
}: BoatWorkspaceShellProps) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentView, setCurrentView] = useState<"trip" | "visits">(initialView);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [timelineEditVisit, setTimelineEditVisit] = useState<VisitView | null>(null);
  const conflicts = computeVisitConflicts(season, tripSegments, visits);

  const filteredSegments = [...tripSegments]
    .filter((segment) => (statusFilter ? segment.status === statusFilter : true))
    .sort(
      (left, right) =>
        left.start_date.localeCompare(right.start_date) ||
        left.end_date.localeCompare(right.end_date),
    );

  const query = queryFilter?.trim().toLowerCase() ?? "";
  const filteredVisits = visits.filter((visit) => {
    const matchesStatus = statusFilter ? visit.status === statusFilter : true;
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

  useEffect(() => {
    const requestedView = searchParams.get("view");
    if (requestedView === "trip" || requestedView === "visits") {
      setCurrentView(requestedView);
      return;
    }

    setCurrentView(initialView);
  }, [initialView, searchParams]);

  const switchView = (nextView: "trip" | "visits") => {
    setCurrentView(nextView);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("view", nextView);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  return (
    <>
      <div className="workspace-selector" data-tour="boat-nav">
        <button
          className={currentView === "trip" ? "is-active" : undefined}
          onClick={() => switchView("trip")}
          type="button"
        >
          {t("boatNav.trip")}
        </button>
        <button
          className={currentView === "visits" ? "is-active" : undefined}
          onClick={() => switchView("visits")}
          type="button"
        >
          {t("boatNav.visits")}
        </button>
        {canShare ? (
          <Link href={`/boats/${boatId}/share`}>{t("boatNav.share")}</Link>
        ) : null}
      </div>

      <section className="workspace-grid workspace-grid--single">
        <div className="workspace-main" data-tour="boat-timeline">
          <Timeline
            onTripSegmentSelect={(segment) => {
              setSelectedEntityId(segment.id);
              switchView("trip");
            }}
            onVisitClick={
              canEdit
                ? (visit) => {
                    switchView("visits");
                    setTimelineEditVisit(visit);
                    setSelectedEntityId(visit.id);
                  }
                : undefined
            }
            onVisitSelect={(visit) => {
              setSelectedEntityId(visit.id);
              switchView("visits");
            }}
            season={season}
            selectedEntityId={selectedEntityId}
            subtitle=""
            title={t("planning.timelineTitle")}
            tripSegments={tripSegments}
            visits={visits}
          />
        </div>
      </section>

      <section className="workspace-grid workspace-grid--trip">
        <article className="dashboard-card workspace-main" data-tour="boat-detail">
          {currentView === "trip" ? (
            <>
              <div className="card-header">
                <div>
                  <p className="eyebrow">{t("planning.tripSegments")}</p>
                  <h2>{t("planning.routeBlocks")} - {season.name}</h2>
                </div>
                <form className="inline-filters" method="get">
                  <input name="view" type="hidden" value="trip" />
                  <input name="season" type="hidden" value={seasonId} />
                  <select defaultValue={statusFilter ?? ""} name="status">
                    <option value="">{t("planning.allStatuses")}</option>
                    <option value="tentative">{t("status.tentative")}</option>
                    <option value="planned">{t("status.planned")}</option>
                    <option value="confirmed">{t("status.confirmed")}</option>
                  </select>
                  <button className="link-button" type="submit">
                    {t("planning.filter")}
                  </button>
                </form>
              </div>

              <TripSegmentsManager
                boatId={boatId}
                canEdit={canEdit}
                onDelete={onDeleteTripSegment}
                onSave={onSaveTripSegment}
                seasonId={seasonId}
                seasonStart={seasonStart}
                segments={filteredSegments}
              />
            </>
          ) : (
            <>
              <div className="card-header">
                <div>
                  <p className="eyebrow">{t("planning.visitsList")}</p>
                  <h2>{season.name}</h2>
                </div>
                <form className="inline-filters" method="get">
                  <input name="view" type="hidden" value="visits" />
                  <input name="season" type="hidden" value={seasonId} />
                  <input
                    defaultValue={queryFilter ?? ""}
                    name="q"
                    placeholder={t("planning.searchVisitsPlaceholder")}
                  />
                  <select defaultValue={statusFilter ?? ""} name="status">
                    <option value="">{t("planning.allStatuses")}</option>
                    <option value="tentative">{t("status.tentative")}</option>
                    <option value="confirmed">{t("status.confirmed")}</option>
                    <option value="cancelled">{t("status.cancelled")}</option>
                  </select>
                  <button className="link-button" type="submit">
                    {t("planning.applyFilters")}
                  </button>
                </form>
              </div>

              <VisitsManager
                boatId={boatId}
                canEdit={canEdit}
                emptyMessage={
                  statusFilter || queryFilter
                    ? t("planning.noVisitsMatch")
                    : t("planning.noVisitsEmpty")
                }
                externalEditVisit={timelineEditVisit}
                onDelete={onDeleteVisit}
                onExternalEditHandled={() => setTimelineEditVisit(null)}
                onSave={onSaveVisit}
                seasonId={seasonId}
                seasonStart={seasonStart}
                visits={filteredVisits}
              />
            </>
          )}
        </article>

        <aside className="stack" data-tour="boat-map">
          <MapPanel
            selectedEntityId={selectedEntityId}
            tall
            title={t("planning.tripAndVisitPlaces")}
            tripSegments={tripSegments}
            visits={visits}
          />

          {currentView === "visits" && conflicts.length > 0 ? (
            <WarningsCard conflicts={conflicts} />
          ) : null}
        </aside>
      </section>
    </>
  );
}

function WarningsCard({ conflicts }: { conflicts: VisitConflict[] }) {
  const { t } = useI18n();

  return (
    <article className="dashboard-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">{t("planning.warnings")}</p>
          <h2>{t("planning.reviewBeforeConfirming")}</h2>
        </div>
      </div>
      <ul className="list">
        {conflicts.map((conflict, index) => (
          <li key={`${conflict.visitId}-${index}`}>{conflict.message}</li>
        ))}
      </ul>
    </article>
  );
}
