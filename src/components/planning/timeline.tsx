"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { useI18n } from "@/components/i18n/provider";
import {
  computeAvailability,
  diffDaysInclusive,
  formatLongDate,
  formatShortDate,
  hasVisitDateRange,
  type AvailabilityBlock,
  type TripSegmentView,
  type VisitView,
} from "@/lib/planning";
import { getDocumentLocale, getIntlLocale } from "@/lib/i18n";
import type { Database } from "@/types/database";

type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];

type TimelineProps = {
  season: SeasonRow | null;
  tripSegments: TripSegmentView[];
  visits: VisitView[];
  title: string;
  subtitle: string;
  onVisitClick?: (visit: VisitView) => void;
  onVisitSelect?: (visit: VisitView) => void;
  onTripSegmentSelect?: (segment: TripSegmentView) => void;
  selectedEntityId?: string | null;
  showVisits?: boolean;
  showAvailability?: boolean;
};

type TimelineTooltipState = {
  content: string;
  x: number;
  y: number;
} | null;

const buildMonthMarkers = (season: SeasonRow) => {
  const markers: { label: string; offset: number }[] = [];
  const dayMarkers: { label: string; offset: number }[] = [];
  const totalDays = diffDaysInclusive(season.start_date, season.end_date);
  const current = new Date(`${season.start_date}T00:00:00Z`);
  current.setUTCDate(1);

  while (current <= new Date(`${season.end_date}T00:00:00Z`)) {
    const markerDate = current.toISOString().slice(0, 10);
    if (markerDate >= season.start_date && markerDate <= season.end_date) {
      const offset =
        ((diffDaysInclusive(season.start_date, markerDate) - 1) / totalDays) * 100;
      markers.push({
        label: current.toLocaleString(getIntlLocale(getDocumentLocale()), {
          month: "short",
        }),
        offset,
      });
    }

    [1, 15].forEach((day) => {
      const dayDate = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), day));
      const dayLabel = dayDate.toISOString().slice(0, 10);
      if (dayLabel >= season.start_date && dayLabel <= season.end_date) {
        const offset =
          ((diffDaysInclusive(season.start_date, dayLabel) - 1) / totalDays) * 100;
        dayMarkers.push({
          label: String(day),
          offset,
        });
      }
    });
    current.setUTCMonth(current.getUTCMonth() + 1);
  }

  return { markers, dayMarkers };
};

const toBarStyle = (season: SeasonRow, start: string, end: string) => {
  const totalDays = diffDaysInclusive(season.start_date, season.end_date);
  const startOffset =
    ((diffDaysInclusive(season.start_date, start) - 1) / totalDays) * 100;
  const width = (diffDaysInclusive(start, end) / totalDays) * 100;

  return {
    left: `${startOffset}%`,
    width: `${Math.max(width, 1.2)}%`,
  };
};

const availabilityOrder: AvailabilityBlock["status"][] = [
  "occupied",
  "tentative",
  "available",
  "undefined",
];

const getShortName = (name: string | null) => {
  if (!name) return "Visit";
  return name.split(" ")[0] ?? name;
};

export const Timeline = ({
  season,
  tripSegments,
  visits,
  title,
  onVisitClick,
  onVisitSelect,
  onTripSegmentSelect,
  selectedEntityId,
  showVisits = true,
  showAvailability = true,
}: TimelineProps) => {
  const { t } = useI18n();
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [selectedAvailabilityIndex, setSelectedAvailabilityIndex] = useState<number | null>(
    null,
  );
  const [zoom, setZoom] = useState(1);
  const [tooltip, setTooltip] = useState<TimelineTooltipState>(null);
  const tooltipTimeoutRef = useRef<number | null>(null);

  if (!season) {
    return (
      <article className="timeline-card">
        <div className="timeline-card__header">
          <div>
            <p className="eyebrow">{title}</p>
            <h2>{t("planning.noSeasonSelected")}</h2>
          </div>
        </div>
      </article>
    );
  }

  const availability = computeAvailability(season, tripSegments, visits);
  const sortedAvailability = [...availability].sort(
    (a, b) =>
      availabilityOrder.indexOf(a.status) - availabilityOrder.indexOf(b.status),
  );
  const { markers: monthMarkers, dayMarkers } = buildMonthMarkers(season);
  const isTimelineEmpty = tripSegments.length === 0 && visits.length === 0;
  const expandedVisit = visits.find((v) => v.id === expandedVisitId) ?? null;
  const selectedAvailability =
    selectedAvailabilityIndex == null ? null : sortedAvailability[selectedAvailabilityIndex] ?? null;

  const toggleVisit = (visitId: string) => {
    setExpandedVisitId((prev) => (prev === visitId ? null : visitId));
  };

  const showTooltip = (
    event: ReactPointerEvent<HTMLButtonElement>,
    content: string,
  ) => {
    if (tooltipTimeoutRef.current) {
      window.clearTimeout(tooltipTimeoutRef.current);
    }

    const x = event.clientX + 14;
    const y = event.clientY - 12;

    tooltipTimeoutRef.current = window.setTimeout(() => {
      setTooltip({
        content,
        x,
        y,
      });
      tooltipTimeoutRef.current = null;
    }, 500);
  };

  const moveTooltip = (event: ReactPointerEvent<HTMLButtonElement>) => {
    setTooltip((current) =>
      current
        ? {
            ...current,
            x: event.clientX + 14,
            y: event.clientY - 12,
          }
        : current,
    );
  };

  const hideTooltip = () => {
    if (tooltipTimeoutRef.current) {
      window.clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setTooltip(null);
  };

  return (
    <article className="timeline-card">
      <div className="timeline-card__header">
        <div>
          <p className="eyebrow">{title}</p>
          <div className="timeline-card__title-row">
            <h2>{season.name}</h2>
            <span className="timeline-card__season-dates">
              {formatLongDate(season.start_date)} – {formatLongDate(season.end_date)}
            </span>
          </div>
        </div>
        <div className="timeline-card__meta">
          <label className="timeline-zoom">
            <span>Zoom</span>
            <input
              max="2.4"
              min="0.8"
              onChange={(event) => setZoom(Number(event.target.value))}
              step="0.2"
              type="range"
              value={zoom}
            />
          </label>
        </div>
      </div>

      <div className="timeline">
        <div className="timeline__inner" style={{ width: `${zoom * 100}%` }}>
          {isTimelineEmpty ? (
            <div className="timeline__empty">
              <div className="timeline__empty-range">
                <span>{formatShortDate(season.start_date)}</span>
                <span>{formatShortDate(season.end_date)}</span>
              </div>
              <div className="timeline__empty-body">
                <strong>{t("planning.noTripSegments")}</strong>
                <p>{t("planning.emptyTimelineHint")}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="timeline__scale">
                {monthMarkers.map((marker) => (
                  <span
                    key={`${marker.label}-${marker.offset}`}
                    style={{ left: `${marker.offset}%` }}
                  >
                    {marker.label}
                  </span>
                ))}
              </div>
              <div className="timeline__day-scale">
                {dayMarkers.map((marker) => (
                  <span
                    key={`${marker.label}-${marker.offset}`}
                    style={{ left: `${marker.offset}%` }}
                  >
                    {marker.label}
                  </span>
                ))}
              </div>

              <TimelineLane highlight label={t("planning.tripPlan")}>
                {tripSegments.map((segment) => (
                  <button
                    className={`timeline-bar timeline-bar--btn is-${segment.status}${selectedEntityId === segment.id ? " is-selected" : ""}`}
                    key={segment.id}
                    onPointerEnter={(event) =>
                      showTooltip(
                        event,
                        `${segment.location_label} · ${t(`status.${segment.status}` as never)} · ${formatShortDate(segment.start_date)} – ${formatShortDate(segment.end_date)}`,
                      )
                    }
                    onPointerLeave={hideTooltip}
                    onPointerMove={moveTooltip}
                    onClick={() => onTripSegmentSelect?.(segment)}
                    style={toBarStyle(season, segment.start_date, segment.end_date)}
                    type="button"
                  >
                    <span>{segment.location_label}</span>
                  </button>
                ))}
              </TimelineLane>

              {showVisits && visits.length === 0 && (
                <TimelineLane label={t("planning.visit")}>
                  <span />
                </TimelineLane>
              )}
              {showVisits &&
                visits.map((visit) => (
                  <TimelineLane key={visit.id} label={getShortName(visit.visitor_name)}>
                    {hasVisitDateRange(visit) ? (
                      <button
                        aria-expanded={expandedVisitId === visit.id}
                        aria-label={`${t("planning.visit")}: ${visit.visitor_name ?? t("planning.private")}`}
                        className={`timeline-bar timeline-bar--btn is-${visit.status}${expandedVisitId === visit.id || selectedEntityId === visit.id ? " is-selected" : ""}`}
                        onPointerEnter={(event) =>
                          showTooltip(
                            event,
                            `${visit.visitor_name ?? t("planning.visit")} · ${t(`status.${visit.status}` as never)} · ${formatShortDate(visit.embark_date)} – ${formatShortDate(visit.disembark_date)}`,
                          )
                        }
                        onPointerLeave={hideTooltip}
                        onPointerMove={moveTooltip}
                        onClick={() => {
                          toggleVisit(visit.id);
                          onVisitSelect?.(visit);
                        }}
                        style={toBarStyle(season, visit.embark_date, visit.disembark_date)}
                        type="button"
                      >
                        <span>{visit.visitor_name ?? t("planning.visit")}</span>
                      </button>
                    ) : (
                      <span className="muted">{t("planning.restrictedVisitDates")}</span>
                    )}
                  </TimelineLane>
                ))}

              {showAvailability && (
                <TimelineLane availability label={t("planning.availability")}>
                  {sortedAvailability.map((block, index) => (
                    <button
                      className={`timeline-bar timeline-bar--btn is-${block.status}${selectedAvailabilityIndex === index ? " is-selected" : ""}`}
                      key={`${block.status}-${index}-${block.start}`}
                      onPointerEnter={(event) =>
                        showTooltip(
                          event,
                          `${t(`status.${block.status}` as never)} · ${formatShortDate(block.start)} – ${formatShortDate(block.end)}`,
                        )
                      }
                      onPointerLeave={hideTooltip}
                      onPointerMove={moveTooltip}
                      onClick={() => setSelectedAvailabilityIndex(index)}
                      style={toBarStyle(season, block.start, block.end)}
                      type="button"
                    >
                      <span>{t(`status.${block.status}` as never)}</span>
                    </button>
                  ))}
                </TimelineLane>
              )}
            </>
          )}
        </div>
      </div>

      {/* Expanded visit detail panel */}
      {showVisits && expandedVisit && (
        <div className="visit-detail">
          <div className="visit-detail__header">
            <div className="visit-detail__title">
              <span className={`status-pill is-${expandedVisit.status}`}>
                {t(`status.${expandedVisit.status}` as never)}
              </span>
              <strong>{expandedVisit.visitor_name ?? t("planning.privateVisit")}</strong>
            </div>
            <div className="visit-detail__actions">
              {onVisitClick && (
                <button
                  className="link-button"
                  onClick={() => {
                    onVisitClick(expandedVisit);
                    setExpandedVisitId(null);
                  }}
                  type="button"
                >
                  {t("common.edit")}
                </button>
              )}
              <button
                className="modal__close"
                onClick={() => setExpandedVisitId(null)}
                type="button"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="visit-detail__body">
            <span>
              {hasVisitDateRange(expandedVisit)
                ? `${formatShortDate(expandedVisit.embark_date)} – ${formatShortDate(expandedVisit.disembark_date)}`
                : t("planning.restrictedVisitDates")}
            </span>
            {expandedVisit.embark_place_label && (
              <span>↑ {expandedVisit.embark_place_label}</span>
            )}
            {expandedVisit.disembark_place_label && (
              <span>↓ {expandedVisit.disembark_place_label}</span>
            )}
            {expandedVisit.public_notes && (
              <p className="visit-detail__notes">{expandedVisit.public_notes}</p>
            )}
          </div>
        </div>
      )}

      {showAvailability && selectedAvailability && (
        <div className="visit-detail">
          <div className="visit-detail__header">
            <div className="visit-detail__title">
              <span className={`status-pill is-${selectedAvailability.status}`}>
                {t(`status.${selectedAvailability.status}` as never)}
              </span>
              <strong>
                {formatLongDate(selectedAvailability.start)} - {formatLongDate(selectedAvailability.end)}
              </strong>
            </div>
            <div className="visit-detail__actions">
              <button
                className="modal__close"
                onClick={() => setSelectedAvailabilityIndex(null)}
                type="button"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {tooltip ? (
        <div
          className="timeline-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.content}
        </div>
      ) : null}
    </article>
  );
};

const TimelineLane = ({
  label,
  children,
  availability = false,
  highlight = false,
}: {
  label: string;
  children: React.ReactNode;
  availability?: boolean;
  highlight?: boolean;
}) => (
  <div className="timeline__lane">
    <div className="timeline__lane-label">{label}</div>
    <div
      className={`timeline__lane-track${availability ? " timeline__lane-track--availability" : ""}${highlight ? " timeline__lane-track--highlight" : ""}`}
    >
      {children}
    </div>
  </div>
);
