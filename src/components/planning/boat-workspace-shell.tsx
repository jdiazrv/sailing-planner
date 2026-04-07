"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useI18n } from "@/components/i18n/provider";
import { RoutePrefetcher } from "@/components/layout/route-prefetcher";
import { BlockedIntervalsManager } from "@/components/planning/blocked-intervals-manager";
import { MapPanel } from "@/components/planning/map-panel";
import { Timeline } from "@/components/planning/timeline";
import { TripSegmentsManager } from "@/components/planning/trip-segments-manager";
import { VisitsManager } from "@/components/planning/visits-manager";
import {
  computeAvailabilityReport,
  computeVisitConflicts,
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

type BoatWorkspaceShellProps = {
  boatId: string;
  canEdit: boolean;
  canViewVisits: boolean;
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
  const [layoutMode, setLayoutMode] = useState<"split" | "table" | "map">("split");
  const [timeScale, setTimeScale] = useState<"season" | "month" | "week">("season");
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
  const timelineZoom =
    timeScale === "season" ? 1 : timeScale === "month" ? 1.6 : 2.3;
  const showTable = layoutMode !== "map";
  const showMap = layoutMode !== "table";
  const alternateViewHref = `/boats/${boatId}?view=${currentView === "trip" ? "visits" : "trip"}&season=${encodeURIComponent(seasonId)}`;
  const summaryHref = `/boats/${boatId}/summary?season=${encodeURIComponent(seasonId)}`;

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
                    <span>Escala</span>
                    <select
                      onChange={(event) =>
                        setTimeScale(event.target.value as "season" | "month" | "week")
                      }
                      value={timeScale}
                    >
                      <option value="season">Temporada</option>
                      <option value="month">Mes</option>
                      <option value="week">Semana</option>
                    </select>
                  </label>
                  <label className="planning-control">
                    <span>Vista</span>
                    <select
                      onChange={(event) =>
                        setLayoutMode(event.target.value as "split" | "table" | "map")
                      }
                      value={layoutMode}
                    >
                      <option value="split">Tabla + mapa</option>
                      <option value="table">Solo tabla</option>
                      <option value="map">Solo mapa</option>
                    </select>
                  </label>
                </div>
                <div className="planning-chip-group" data-tour="timeline-layers">
                  <span className="planning-chip-group__label">Capas</span>
                  <button className="planning-chip is-locked" type="button">
                    Escalas
                  </button>
                  {canViewVisits ? (
                    <button
                      className={`planning-chip${showPeopleLayer ? " is-active" : ""}`}
                      onClick={() => setShowPeopleLayer((value) => !value)}
                      type="button"
                    >
                      Visitas
                    </button>
                  ) : null}
                  <button
                    className={`planning-chip${showAvailabilityLayer ? " is-active" : ""}`}
                    onClick={() => setShowAvailabilityLayer((value) => !value)}
                    type="button"
                  >
                    Disponibilidad
                  </button>
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
            hideHeader
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
                <div className="card-header">
                  <div>
                    <p className="eyebrow">{canEdit ? "Editar" : "Ver"}</p>
                    <h2>{t("planning.tripSegments")}</h2>
                  </div>
                  <div className="card-header__actions">
                    <span className="muted">{filteredSegments.length} escalas</span>
                    {canViewVisits ? (
                      <button className="secondary-button secondary-button--small" data-tour="boat-switch-visits" onClick={() => switchView("visits")} type="button">
                        Ver visitas
                      </button>
                    ) : null}
                    {canEdit ? (
                      <button
                        className="secondary-button secondary-button--small"
                        onClick={() => { setBlockedSectionOpen(true); setBlockedOpenAdd(true); }}
                        type="button"
                      >
                        + Bloquear período
                      </button>
                    ) : null}
                    <Link className="secondary-button secondary-button--small" href={summaryHref}>
                      {t("summary.open")}
                    </Link>
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
                <div className="card-header">
                  <div>
                    <p className="eyebrow">{canEdit ? "Editar" : "Ver"}</p>
                    <h2>{t("planning.visitsList")}</h2>
                  </div>
                  <div className="card-header__actions">
                    <span className="muted">{filteredVisits.length} visitas</span>
                    <button className="secondary-button secondary-button--small" data-tour="boat-switch-trip" onClick={() => switchView("trip")} type="button">
                      Ver escalas
                    </button>
                    {canEdit ? (
                      <button
                        className="secondary-button secondary-button--small"
                        onClick={() => { setBlockedSectionOpen(true); setBlockedOpenAdd(true); }}
                        type="button"
                      >
                        + Bloquear período
                      </button>
                    ) : null}
                    <Link className="secondary-button secondary-button--small" href={summaryHref}>
                      {t("summary.open")}
                    </Link>
                  </div>
                </div>

                <VisitsManager
                  boatId={boatId}
                  canEdit={canEdit}
                  emptyMessage={t("planning.noVisitsEmpty")}
                  externalEditVisit={timelineEditVisit}
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
                Disponibilidad · {availabilityPlaceRows.length} períodos
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
                  <p className="muted">No hay períodos disponibles.</p>
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
                Bloqueado · {blockedIntervals.length} períodos
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
          <MapPanel
            dataTour="boat-map"
            deemphasized={!selectedEntityId && layoutMode === "split"}
            onSelectEntity={({ entityId, tone }) => {
              setSelectedEntityId(entityId);
              switchView(tone === "visit" ? "visits" : "trip");
            }}
            selectedEntityId={selectedEntityId}
            tall
            title={t("planning.tripAndVisitPlaces")}
            tripSegments={filteredSegments}
            visits={filteredVisits}
          />
        </aside>
        ) : null}
      </section>
    </>
  );
}

function WarningsCard({ conflicts }: { conflicts: VisitConflict[] }) {
  const { t } = useI18n();

  return (
    <article className="dashboard-card">
      <details className="inline-section">
        <summary className="inline-section__summary">
          <span className="eyebrow">{t("planning.warnings")}</span>
          {t("planning.reviewBeforeConfirming")} · {conflicts.length}
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
