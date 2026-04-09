"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useI18n } from "@/components/i18n/provider";
import { RoutePrefetcher } from "@/components/layout/route-prefetcher";
import { BlockedIntervalsManager } from "@/components/planning/blocked-intervals-manager";
import { Timeline } from "@/components/planning/timeline";
import { TripSegmentsManager } from "@/components/planning/trip-segments-manager";
import { VisitsManager } from "@/components/planning/visits-manager";
import {
  computeAvailabilityReport,
  computeVisitConflicts,
  getVisitDisplayName,
  hasVisitDateRange,
  sortTripSegmentsBySchedule,
  type PortStopView,
  type VisitConflict,
  type VisitPanelDisplayMode,
  type VisitView,
} from "@/lib/planning";
import { getDocumentLocale, getIntlLocale } from "@/lib/i18n";
import { measureClientSync, startClientPerf } from "@/lib/perf-debug";
import type { Database } from "@/types/database";

type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];

const LazyMapPanel = dynamic(
  () => import("@/components/planning/map-panel").then((module) => module.MapPanel),
  {
    loading: () => <MapPanelPlaceholder />,
  },
);

type BoatWorkspaceShellProps = {
  boatId: string;
  canEdit: boolean;
  canViewVisits: boolean;
  isTimelinePublic?: boolean | null;
  initialView: "trip" | "visits";
  queryFilter?: string;
  season: SeasonRow;
  seasonId: string;
  seasonStart: string;
  statusFilter?: string;
  tripSegments: PortStopView[];
  visits: VisitView[];
  visitPanelDisplayMode: VisitPanelDisplayMode;
  onSaveTripSegment: (fd: FormData) => Promise<void>;
  onDeleteTripSegment: (fd: FormData) => Promise<void>;
  onSaveVisit: (fd: FormData) => Promise<void>;
  onDeleteVisit: (fd: FormData) => Promise<void>;
};

const formatCompactAvailabilityRange = (start: string, end: string) => {
  const locale = getIntlLocale(getDocumentLocale());
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  const startDay = startDate.getUTCDate();
  const endDay = endDate.getUTCDate();
  const startMonth = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(startDate);
  const endMonth = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(endDate);
  const sameMonth =
    startDate.getUTCFullYear() === endDate.getUTCFullYear() &&
    startDate.getUTCMonth() === endDate.getUTCMonth();

  if (sameMonth) {
    return `${startDay} - ${endDay} ${startMonth}`;
  }

  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
};

export function BoatWorkspaceShell(props: BoatWorkspaceShellProps) {
  const {
    boatId,
    canEdit,
    canViewVisits,
    isTimelinePublic = null,
    initialView,
    season,
    seasonId,
    seasonStart,
    tripSegments,
    visits,
    visitPanelDisplayMode,
    onSaveTripSegment,
    onDeleteTripSegment,
    onSaveVisit,
    onDeleteVisit,
  } = props;
  const { t } = useI18n();
  const documentLocale = getDocumentLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentView, setCurrentView] = useState<"trip" | "visits">(initialView);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [timelineEditVisit, setTimelineEditVisit] = useState<VisitView | null>(null);
  const [timelineEditBlockedInterval, setTimelineEditBlockedInterval] = useState<VisitView | null>(null);
  const [timelineEditSegment, setTimelineEditSegment] = useState<PortStopView | null>(null);
  const [showPeopleLayer, setShowPeopleLayer] = useState(true);
  const [showAvailabilityLayer, setShowAvailabilityLayer] = useState(true);
  const [availabilitySectionOpen, setAvailabilitySectionOpen] = useState(false);
  const [availabilitySectionLoaded, setAvailabilitySectionLoaded] = useState(false);
  const [blockedSectionOpen, setBlockedSectionOpen] = useState(
    searchParams.get("blocked") === "create",
  );
  const [blockedOpenAdd, setBlockedOpenAdd] = useState(
    searchParams.get("blocked") === "create",
  );
  const [shouldRenderMap, setShouldRenderMap] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"split" | "table" | "map">("map");
  const [timeScale, setTimeScale] = useState<"season" | "month" | "week">("week");
  const regularVisits = visits.filter(
    (visit) => visit.status !== "blocked" && hasVisitDateRange(visit),
  );
  const blockedIntervals = visits.filter(
    (visit) => visit.status === "blocked" && hasVisitDateRange(visit),
  );
  const conflicts = computeVisitConflicts(season, tripSegments, regularVisits);
  const filteredSegments = useMemo(
    () =>
      measureClientSync(
        "planning.shell.sortTripSegments",
        () => sortTripSegmentsBySchedule(tripSegments),
        { boatId, seasonId, segments: tripSegments.length },
      ),
    [boatId, seasonId, tripSegments],
  );
  const filteredVisits = regularVisits;
  const availabilityReport = useMemo(
    () =>
      measureClientSync(
        "planning.shell.availabilityReport",
        () => computeAvailabilityReport(season, filteredSegments, filteredVisits),
        {
          boatId,
          seasonId,
          segments: filteredSegments.length,
          visits: filteredVisits.length,
        },
      ),
    [boatId, filteredSegments, filteredVisits, season, seasonId],
  );
  const availabilityPlaceRows = availabilityReport.placeRows;
  const selectedEntity = useMemo(
    () =>
      [...filteredSegments, ...filteredVisits, ...blockedIntervals].find(
        (entry) => entry.id === selectedEntityId,
      ) ?? null,
    [blockedIntervals, filteredSegments, filteredVisits, selectedEntityId],
  );
  const selectedEntityLabel = useMemo(() => {
    if (!selectedEntity) {
      return null;
    }

    if ("location_label" in selectedEntity) {
      return selectedEntity.location_label;
    }

    if (selectedEntity.status === "blocked") {
      if (!selectedEntity.embark_date || !selectedEntity.disembark_date) {
        return t("planning.blockedPeriods");
      }

      return `${t("planning.blockedPeriods")} · ${formatCompactAvailabilityRange(
        selectedEntity.embark_date,
        selectedEntity.disembark_date,
      )}`;
    }

    return getVisitDisplayName(selectedEntity, t("planning.visit"));
  }, [selectedEntity, t]);
  const timelineZoom =
    timeScale === "season" ? 1 : timeScale === "month" ? 1.6 : 2.3;
  const showTable = layoutMode !== "map";
  const showMap = layoutMode !== "table";
  const alternateViewHref = `/boats/${boatId}?view=${currentView === "trip" ? "visits" : "trip"}&season=${encodeURIComponent(seasonId)}`;
  const summaryHref = `/boats/${boatId}/summary?season=${encodeURIComponent(seasonId)}`;
  const currentViewCount = currentView === "trip" ? filteredSegments.length : filteredVisits.length;
  const currentViewLabel = currentView === "trip" ? t("planning.tripSegments") : t("planning.visitsList");
  const currentViewCountLabel = `${currentViewCount} ${currentViewLabel.toLocaleLowerCase(documentLocale)}`;

  const setWorkspaceLayout = (nextLayout: "split" | "table" | "map") => {
    if (nextLayout !== "table") {
      setShouldRenderMap(true);
    }

    setLayoutMode(nextLayout);
  };

  useEffect(() => {
    if (searchParams.get("blocked") === "create") {
      setBlockedSectionOpen(true);
      setBlockedOpenAdd(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedEntityId) {
      return;
    }

    const stillVisible = [...filteredSegments, ...filteredVisits, ...blockedIntervals].some(
      (entry) => entry.id === selectedEntityId,
    );

    if (!stillVisible) {
      setSelectedEntityId(null);
    }
  }, [blockedIntervals, filteredSegments, filteredVisits, selectedEntityId]);

  useEffect(() => {
    const requestedView = searchParams.get("view");
    if (requestedView === "trip" || requestedView === "visits") {
      setCurrentView(requestedView);
      return;
    }

    setCurrentView(initialView);
  }, [initialView, searchParams]);

  useEffect(() => {
    if (!showMap || shouldRenderMap) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShouldRenderMap(true);
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [shouldRenderMap, showMap]);

  useEffect(() => {
    const timing = startClientPerf("planning.shell.commit", {
      boatId,
      seasonId,
      currentView,
      layoutMode,
      timeScale,
      segments: filteredSegments.length,
      visits: filteredVisits.length,
      selectedEntityId: selectedEntityId ?? null,
    });

    const frame = window.requestAnimationFrame(() => {
      timing.end({
        blockedIntervals: blockedIntervals.length,
        availabilityRows: availabilityPlaceRows.length,
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    availabilityPlaceRows.length,
    blockedIntervals.length,
    boatId,
    currentView,
    filteredSegments.length,
    filteredVisits.length,
    layoutMode,
    seasonId,
    selectedEntityId,
    timeScale,
  ]);

  const switchView = (nextView: "trip" | "visits") => {
    setCurrentView(nextView);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("view", nextView);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  return (
    <>
      <RoutePrefetcher
        routes={[
          "/dashboard",
          `/boats/${boatId}/share`,
          alternateViewHref,
          summaryHref,
          "/shared",
        ]}
      />
      <section className="workspace-grid workspace-grid--single">
        <div className="workspace-main" data-tour="boat-timeline">
          <Timeline
            availabilityBlocks={availabilityReport.blocks}
            headerControls={
              <div className="timeline-card__controls-inner planning-control-bar" data-tour="planning-control-bar">
                <div className="planning-control-bar__row">
                  <label className="planning-control">
                    <span>{t("planning.zoom")}</span>
                    <select
                      onChange={(event) =>
                        setTimeScale(event.target.value as "season" | "month" | "week")
                      }
                      value={timeScale}
                    >
                      <option value="season">{t("planning.scaleSeason")}</option>
                      <option value="month">{t("planning.scaleMonth")}</option>
                      <option value="week">{t("planning.scaleWeek")}</option>
                    </select>
                  </label>
                  <div className="planning-chip-group planning-chip-group--compact" data-tour="timeline-layers">
                    <button className="planning-chip is-locked" type="button">
                      <LayerFilterIcon />
                      {t("planning.tripSegments")}
                    </button>
                    {canViewVisits ? (
                      <button
                        className={`planning-chip${showPeopleLayer ? " is-active" : ""}`}
                        onClick={() => setShowPeopleLayer((value) => !value)}
                        type="button"
                      >
                        <LayerFilterIcon />
                        {t("planning.visitsList")}
                      </button>
                    ) : null}
                    <button
                      className={`planning-chip${showAvailabilityLayer ? " is-active" : ""}`}
                      onClick={() => setShowAvailabilityLayer((value) => !value)}
                      type="button"
                    >
                      <LayerFilterIcon />
                      {t("planning.availability")}
                    </button>
                  </div>
                </div>
              </div>
            }
            onTripSegmentEdit={
              canEdit
                ? (segment) => {
                    switchView("trip");
                    setTimelineEditSegment(segment);
                    setSelectedEntityId(segment.id);
                  }
                : undefined
            }
            onTripSegmentSelect={(segment) => {
              if (selectedEntityId === segment.id) {
                setSelectedEntityId(null);
                return;
              }
              setSelectedEntityId(segment.id);
              switchView("trip");
            }}
            onVisitClick={
              canEdit
                ? (visit) => {
                    if (visit.status === "blocked") {
                      setBlockedSectionOpen(true);
                      setTimelineEditBlockedInterval(visit);
                    } else {
                      switchView("visits");
                      setTimelineEditVisit(visit);
                    }
                    setSelectedEntityId(visit.id);
                  }
                : undefined
            }
            onVisitSelect={(visit) => {
              if (selectedEntityId === visit.id) {
                setSelectedEntityId(null);
                return;
              }
              setSelectedEntityId(visit.id);
              if (visit.status === "blocked") {
                setBlockedSectionOpen(true);
                return;
              }
              switchView("visits");
            }}
            season={season}
            selectedEntityId={selectedEntityId}
            showAvailability={showAvailabilityLayer}
            showVisits={canViewVisits && showPeopleLayer}
            enableVisits={canViewVisits}
            subtitle=""
            title={t("planning.timelineTitle")}
            tripSegments={filteredSegments}
            visits={visits}
            visitsCollapsed={!showPeopleLayer}
            availabilityCollapsed={!showAvailabilityLayer}
            visitPanelDisplayMode={visitPanelDisplayMode}
            zoom={timelineZoom}
          />
        </div>
      </section>

      <section className="workspace-grid workspace-grid--single">
        <div className="workspace-section-switch workspace-section-switch--compact">
          <div className="workspace-section-switch__groups">
            {showTable ? (
              <div
                aria-label={t("planning.workspaceSections")}
                className="workspace-view-switch workspace-view-switch--segmented"
                role="tablist"
              >
                <button
                  aria-selected={currentView === "trip"}
                  className={currentView === "trip" ? "is-active" : undefined}
                  data-tour="boat-switch-trip"
                  onClick={() => switchView("trip")}
                  role="tab"
                  type="button"
                >
                  <span>{t("planning.tripSegments")}</span>
                </button>
                {canViewVisits ? (
                  <button
                    aria-selected={currentView === "visits"}
                    className={currentView === "visits" ? "is-active" : undefined}
                    data-tour="boat-switch-visits"
                    onClick={() => switchView("visits")}
                    role="tab"
                    type="button"
                  >
                    <span>{t("planning.visitsList")}</span>
                  </button>
                ) : null}
              </div>
            ) : null}
            <div
              aria-label={t("planning.layoutView")}
              className="workspace-view-switch workspace-view-switch--segmented workspace-view-switch--layout"
              role="tablist"
            >
              <button
                aria-selected={layoutMode === "split"}
                className={layoutMode === "split" ? "is-active" : undefined}
                data-tour="workspace-layout-split"
                onClick={() => setWorkspaceLayout("split")}
                role="tab"
                type="button"
              >
                <span>{t("planning.layoutSplit")}</span>
              </button>
              <button
                aria-selected={layoutMode === "table"}
                className={layoutMode === "table" ? "is-active" : undefined}
                data-tour="workspace-layout-table"
                onClick={() => setWorkspaceLayout("table")}
                role="tab"
                type="button"
              >
                <span>{t("planning.layoutTableOnly")}</span>
              </button>
              <button
                aria-selected={layoutMode === "map"}
                className={layoutMode === "map" ? "is-active" : undefined}
                data-tour="workspace-layout-map"
                onClick={() => setWorkspaceLayout("map")}
                role="tab"
                type="button"
              >
                <span>{t("planning.layoutMapOnly")}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        className="workspace-grid workspace-grid--trip"
        style={{ gridTemplateColumns: showTable && showMap ? undefined : "1fr" }}
      >
        {showTable ? (
        <div className="stack">
          <article
            className="dashboard-card workspace-main"
            data-tour={currentView === "visits" ? "boat-visits-card" : "boat-detail"}
            data-tour-detail={currentView === "visits" ? "boat-detail" : undefined}
          >
            {currentView === "trip" ? (
              <>
                <div className="card-header card-header--workspace">
                  <div className="workspace-panel__heading">
                    <h2>{t("planning.seasonPlanTitle")}</h2>
                    <p className="workspace-panel__meta">{currentViewCountLabel}</p>
                  </div>
                  <div className="card-header__actions">
                    {selectedEntityLabel ? (
                      <span className="workspace-selection-chip">
                        {t("planning.selectedItem")}: {selectedEntityLabel}
                      </span>
                    ) : null}
                    {selectedEntityId ? (
                      <button
                        className="link-button"
                        onClick={() => setSelectedEntityId(null)}
                        type="button"
                      >
                        {t("planning.clearSelection")}
                      </button>
                    ) : null}
                  </div>
                </div>

                <TripSegmentsManager
                  boatId={boatId}
                  canEdit={canEdit}
                  externalEditSegment={timelineEditSegment}
                  onDelete={onDeleteTripSegment}
                  onExternalEditHandled={() => setTimelineEditSegment(null)}
                  onSave={onSaveTripSegment}
                  onSelectSegment={(segment) => setSelectedEntityId(segment.id)}
                  seasonId={seasonId}
                  seasonStart={seasonStart}
                  selectedSegmentId={selectedEntityId}
                  segments={filteredSegments}
                />
              </>
            ) : (
              <>
                <div className="card-header card-header--workspace">
                  <div className="workspace-panel__heading">
                    <h2>{t("planning.visitsPlanTitle")}</h2>
                    <p className="workspace-panel__meta">{currentViewCountLabel}</p>
                  </div>
                  <div className="card-header__actions">
                    {selectedEntityLabel ? (
                      <span className="workspace-selection-chip">
                        {t("planning.selectedItem")}: {selectedEntityLabel}
                      </span>
                    ) : null}
                    {selectedEntityId ? (
                      <button
                        className="link-button"
                        onClick={() => setSelectedEntityId(null)}
                        type="button"
                      >
                        {t("planning.clearSelection")}
                      </button>
                    ) : null}
                  </div>
                </div>

                <VisitsManager
                  boatId={boatId}
                  canEdit={canEdit}
                  emptyMessage={t("planning.noVisitsEmpty")}
                  externalEditVisit={timelineEditVisit}
                  isTimelinePublic={isTimelinePublic}
                  onDelete={onDeleteVisit}
                  onExternalEditHandled={() => setTimelineEditVisit(null)}
                  onSave={onSaveVisit}
                  onSelectVisit={(visit) => setSelectedEntityId(visit.id)}
                  seasonId={seasonId}
                  seasonStart={seasonStart}
                  selectedVisitId={selectedEntityId}
                  visitPanelDisplayMode={visitPanelDisplayMode}
                  visits={filteredVisits}
                />
              </>
            )}
            <details
              className="inline-section"
              data-tour="availability-section"
              open={availabilitySectionOpen}
              onToggle={(e) => {
                const open = (e.currentTarget as HTMLDetailsElement).open;
                setAvailabilitySectionOpen(open);
                if (open) setAvailabilitySectionLoaded(true);
              }}
            >
              <summary className="inline-section__summary">
                <span className="inline-section__summary-main">
                  <span className="inline-section__label">{t("planning.availability")}</span>
                  <span className="inline-section__count">
                    {availabilityPlaceRows.length} {t("planning.periods")}
                  </span>
                </span>
              </summary>
              {availabilitySectionLoaded ? (
                availabilityPlaceRows.length ? (
                  <ul className="list availability-places-list">
                    {availabilityPlaceRows.map((row) => (
                      <li key={`${row.status}-${row.segmentId ?? "none"}-${row.start}`}>
                        <span className="availability-places-list__line">
                          <span className="availability-places-list__dates">
                            {formatCompactAvailabilityRange(row.start, row.end)}
                          </span>
                          <span className="availability-places-list__label">
                            {row.label}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">{t("planning.noAvailabilityPeriods")}</p>
                )
              ) : null}
            </details>

            <details className="inline-section" open={blockedSectionOpen}>
              <summary
                className="inline-section__summary"
                onClick={(event) => {
                  event.preventDefault();
                  setBlockedSectionOpen((value) => !value);
                }}
              >
                <span className="inline-section__summary-main">
                  <span className="inline-section__label">{t("planning.blockedPeriods")}</span>
                  <span className="inline-section__count">
                    {blockedIntervals.length} {t("planning.periods")}
                  </span>
                </span>
                {canEdit ? (
                  <button
                    className="inline-section__add-btn"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setBlockedSectionOpen(true);
                      setBlockedOpenAdd(true);
                    }}
                    type="button"
                  >
                    + {t("planning.addBlockedPeriod")}
                  </button>
                ) : null}
              </summary>
              <BlockedIntervalsManager
                boatId={boatId}
                canEdit={canEdit}
                externalEditInterval={timelineEditBlockedInterval}
                initiallyOpenAdd={blockedOpenAdd}
                intervals={blockedIntervals}
                onDelete={onDeleteVisit}
                onExternalEditHandled={() => setTimelineEditBlockedInterval(null)}
                onSave={onSaveVisit}
                seasonId={seasonId}
                seasonStart={seasonStart}
              />
            </details>
          </article>

          {conflicts.length > 0 ? <WarningsCard conflicts={conflicts} /> : null}
        </div>
        ) : null}

        {showMap ? (
        <aside className="stack">
          {shouldRenderMap ? (
            <LazyMapPanel
              dataTour="boat-map"
              deemphasized={!selectedEntityId && layoutMode === "split"}
              onSelectEntity={({ entityId, tone }) => {
                setSelectedEntityId(entityId);
                if (showTable) {
                  switchView(tone === "visit" ? "visits" : "trip");
                }
              }}
              selectedEntityId={selectedEntityId}
              tall
              title={t("planning.seasonMapTitle")}
              tripSegments={filteredSegments}
              visits={filteredVisits}
            />
          ) : (
            <MapPanelPlaceholder />
          )}
        </aside>
        ) : null}
      </section>
    </>
  );
}

function MapPanelPlaceholder() {
  const { t } = useI18n();

  return (
    <article className="dashboard-card map-panel map-panel--tall">
      <div className="card-header">
        <div>
          <p className="eyebrow">{t("planning.map")}</p>
          <h2>{t("planning.loadingMap")}</h2>
        </div>
      </div>
      <div className="map-empty">{t("planning.loadingMap")}</div>
    </article>
  );
}

function WarningsCard({ conflicts }: { conflicts: VisitConflict[] }) {
  const { t } = useI18n();

  return (
    <article className="dashboard-card">
      <details className="inline-section">
        <summary className="inline-section__summary">
          <span className="inline-section__summary-main">
            <span className="inline-section__label">{t("planning.reviewBeforeConfirming")}</span>
            <span className="inline-section__count">
              {conflicts.length} {t("planning.warnings").toLocaleLowerCase(getDocumentLocale())}
            </span>
          </span>
        </summary>
        <ul className="list">
          {conflicts.map((conflict, index) => (
            <li key={`${conflict.visitId}-${index}`}>{conflict.message}</li>
          ))}
        </ul>
      </details>
    </article>
  );
}

function LayerFilterIcon() {
  return (
    <span aria-hidden="true" className="planning-chip__filter-icon">
      <svg
        fill="none"
        height="12"
        viewBox="0 0 12 12"
        width="12"
      >
        <path
          d="M1.5 2.25H10.5L7.25 5.75V9.25L4.75 10V5.75L1.5 2.25Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.1"
        />
      </svg>
    </span>
  );
}
