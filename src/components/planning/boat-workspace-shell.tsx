"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useI18n } from "@/components/i18n/provider";
import { RoutePrefetcher } from "@/components/layout/route-prefetcher";
import { BlockedIntervalsManager } from "@/components/planning/blocked-intervals-manager";
import { MapPanel } from "@/components/planning/map-panel";
import { Timeline } from "@/components/planning/timeline";
import { TripSegmentsManager } from "@/components/planning/trip-segments-manager";
import { VisitsManager } from "@/components/planning/visits-manager";
import {
  addDays,
  computeVisitConflicts,
  diffDaysInclusive,
  hasVisitDateRange,
  rangeIncludes,
  type PortStopView,
  type VisitConflict,
  type VisitView,
} from "@/lib/planning";
import { getDocumentLocale, getIntlLocale } from "@/lib/i18n";
import type { Database } from "@/types/database";

type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];

type BoatWorkspaceShellProps = {
  boatId: string;
  canEdit: boolean;
  initialView: "trip" | "visits";
  queryFilter?: string;
  season: SeasonRow;
  seasonId: string;
  seasonStart: string;
  statusFilter?: string;
  tripSegments: PortStopView[];
  visits: VisitView[];
  onSaveTripSegment: (fd: FormData) => Promise<void>;
  onDeleteTripSegment: (fd: FormData) => Promise<void>;
  onSaveVisit: (fd: FormData) => Promise<void>;
  onDeleteVisit: (fd: FormData) => Promise<void>;
};

type AvailabilityPlaceRow = {
  start: string;
  end: string;
  label: string;
  status: "available" | "undefined";
  segmentId: string | null;
};

const getAvailabilityPlaceRows = (
  season: SeasonRow,
  tripSegments: PortStopView[],
  visits: VisitView[],
) => {
  const sortedSegments = [...tripSegments].sort(
    (left, right) =>
      left.start_date.localeCompare(right.start_date) ||
      left.end_date.localeCompare(right.end_date) ||
      (left.sort_order ?? 0) - (right.sort_order ?? 0),
  );
  const totalDays = diffDaysInclusive(season.start_date, season.end_date);
  const rows: AvailabilityPlaceRow[] = [];
  let current: AvailabilityPlaceRow | null = null;

  for (let index = 0; index < totalDays; index += 1) {
    const day = addDays(season.start_date, index);
    const segment =
      sortedSegments.find((entry) => rangeIncludes(entry.start_date, entry.end_date, day)) ?? null;
    const hasConfirmedVisit = visits.some(
      (visit) =>
        hasVisitDateRange(visit) &&
        (visit.status === "confirmed" || visit.status === "blocked") &&
        rangeIncludes(visit.embark_date, visit.disembark_date, day),
    );
    const hasTentativeVisit = visits.some(
      (visit) =>
        hasVisitDateRange(visit) &&
        visit.status === "tentative" &&
        rangeIncludes(visit.embark_date, visit.disembark_date, day),
    );

    let status: AvailabilityPlaceRow["status"] | null = null;
    if (hasConfirmedVisit || hasTentativeVisit) {
      status = null;
    } else if (!segment) {
      status = "undefined";
    } else {
      status = "available";
    }

    if (!status) {
      if (current) {
        rows.push(current);
        current = null;
      }
      continue;
    }

    const nextRow: AvailabilityPlaceRow = {
      start: day,
      end: day,
      label: status === "undefined" ? "Sin definir" : segment?.location_label ?? "Sin definir",
      status,
      segmentId: status === "available" ? segment?.id ?? null : null,
    };

    if (
      !current ||
      current.status !== nextRow.status ||
      current.segmentId !== nextRow.segmentId
    ) {
      if (current) {
        rows.push(current);
      }
      current = nextRow;
      continue;
    }

    current.end = day;
  }

  if (current) {
    rows.push(current);
  }

  return rows;
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
    initialView,
    season,
    seasonId,
    seasonStart,
    tripSegments,
    visits,
    onSaveTripSegment,
    onDeleteTripSegment,
    onSaveVisit,
    onDeleteVisit,
  } = props;
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentView, setCurrentView] = useState<"trip" | "visits">(initialView);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [timelineEditVisit, setTimelineEditVisit] = useState<VisitView | null>(null);
  const [timelineEditSegment, setTimelineEditSegment] = useState<PortStopView | null>(null);
  const [showPeopleLayer, setShowPeopleLayer] = useState(true);
  const [showAvailabilityLayer, setShowAvailabilityLayer] = useState(true);
  const [showBlockedLayer, setShowBlockedLayer] = useState(true);
  const [blockedSectionOpen, setBlockedSectionOpen] = useState(
    searchParams.get("blocked") === "create",
  );
  const [layoutMode, setLayoutMode] = useState<"split" | "table" | "map">("split");
  const [timeScale, setTimeScale] = useState<"season" | "month" | "week">("season");
  const regularVisits = visits.filter((v) => v.status !== "blocked");
  const blockedIntervals = visits.filter((v) => v.status === "blocked");
  const conflicts = computeVisitConflicts(season, tripSegments, regularVisits);
  const filteredSegments = [...tripSegments]
    .sort(
      (left, right) =>
        left.start_date.localeCompare(right.start_date) ||
        left.end_date.localeCompare(right.end_date),
    );
  const filteredVisits = regularVisits;
  const availabilityPlaceRows = getAvailabilityPlaceRows(season, filteredSegments, filteredVisits);
  const timelineZoom =
    timeScale === "season" ? 1 : timeScale === "month" ? 1.6 : 2.3;
  const showTable = layoutMode !== "map";
  const showMap = layoutMode !== "table";
  const nextView = currentView === "trip" ? "visits" : "trip";
  const viewToggleLabel =
    currentView === "trip"
      ? locale === "es"
        ? "Mostrar visitas"
        : "Show visits"
      : locale === "es"
        ? "Mostrar escalas"
        : "Show trip segments";
  const viewPrefetchParams = new URLSearchParams();
  viewPrefetchParams.set("view", nextView);
  viewPrefetchParams.set("season", seasonId);

  useEffect(() => {
    if (searchParams.get("blocked") === "create") {
      setBlockedSectionOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedEntityId) {
      return;
    }

    const stillVisible = [...filteredSegments, ...filteredVisits].some(
      (entry) => entry.id === selectedEntityId,
    );

    if (!stillVisible) {
      setSelectedEntityId(null);
    }
  }, [filteredSegments, filteredVisits, selectedEntityId]);

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
      <RoutePrefetcher
        routes={[
          "/dashboard",
          `/boats/${boatId}/share`,
          `/boats/${boatId}?${viewPrefetchParams.toString()}`,
          "/shared",
        ]}
      />
      <section className="dashboard-card planning-control-bar" data-tour="planning-control-bar">
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
        <div className="planning-control-bar__row">
          <div className="planning-chip-group" data-tour="timeline-layers">
            <span className="planning-chip-group__label">Capas</span>
            <button
              className="planning-chip is-locked"
              type="button"
            >
              Viaje
            </button>
            <button
              className={`planning-chip${showPeopleLayer ? " is-active" : ""}`}
              onClick={() => setShowPeopleLayer((value) => !value)}
              type="button"
            >
              Visitas
            </button>
            <button
              className={`planning-chip${showAvailabilityLayer ? " is-active" : ""}`}
              onClick={() => setShowAvailabilityLayer((value) => !value)}
              type="button"
            >
              Disponibilidad
            </button>
            <button
              className={`planning-chip${showBlockedLayer ? " is-active" : ""}`}
              onClick={() => setShowBlockedLayer((value) => !value)}
              type="button"
            >
              Bloqueado
            </button>
            {canEdit ? (
              <button
                className="secondary-button secondary-button--small"
                onClick={() => {
                  const nextParams = new URLSearchParams(searchParams.toString());
                  nextParams.set("blocked", "create");
                  router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
                  setBlockedSectionOpen(true);
                }}
                type="button"
              >
                + Bloquear período
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="workspace-grid workspace-grid--single">
        <div className="workspace-main" data-tour="boat-timeline">
          <Timeline
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
            showAvailability={showAvailabilityLayer}
            showVisits={showPeopleLayer}
            subtitle=""
            title={t("planning.timelineTitle")}
            tripSegments={tripSegments}
            visits={visits}
            visitsCollapsed={!showPeopleLayer}
            availabilityCollapsed={!showAvailabilityLayer}
            blockedCollapsed={!showBlockedLayer}
            onToggleVisitsCollapsed={() => setShowPeopleLayer((value) => !value)}
            onToggleAvailabilityCollapsed={() => setShowAvailabilityLayer((value) => !value)}
            onToggleBlockedCollapsed={() => setShowBlockedLayer((value) => !value)}
            zoom={timelineZoom}
          />
        </div>
      </section>

      <div className="workspace-view-switch" data-tour="boat-nav">
        <button className="secondary-button" onClick={() => switchView(nextView)} type="button">
          {viewToggleLabel}
        </button>
      </div>

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
                    <p className="eyebrow">{t("planning.tripSegments")}</p>
                    <h2>{t("planning.routeBlocks")} - {season.name}</h2>
                  </div>
                  <span className="muted">{filteredSegments.length} escalas visibles</span>
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
                    <p className="eyebrow">{t("planning.visitsList")}</p>
                    <h2>{season.name}</h2>
                  </div>
                  <span className="muted">{filteredVisits.length} visitas visibles</span>
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
                  visits={filteredVisits}
                />
              </>
            )}
            <details className="inline-section" data-tour="availability-section" open>
              <summary className="inline-section__summary">
                Disponibilidad · {availabilityPlaceRows.length} períodos
              </summary>
              {availabilityPlaceRows.length ? (
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
              )}
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
                initiallyOpenAdd={searchParams.get("blocked") === "create"}
                intervals={blockedIntervals}
                onDelete={onDeleteVisit}
                onSave={onSaveVisit}
                seasonId={seasonId}
                seasonStart={seasonStart}
              />
            </details>
          </article>
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

          {currentView === "visits" && conflicts.length > 0 ? (
            <WarningsCard conflicts={conflicts} />
          ) : null}
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
