"use client";

import NextImage from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useI18n } from "@/components/i18n/provider";
import { renderVisitIdentity } from "@/components/planning/visit-visual";
import {
  computeAvailabilityReport,
  diffDaysInclusive,
  formatLongDate,
  formatShortDate,
  getVisitDisplayName,
  hasVisitDateRange,
  type AvailabilityBlock,
  type PortStopView,
  type VisitPanelDisplayMode,
  type VisitView,
} from "@/lib/planning";
import { getDocumentLocale, getIntlLocale } from "@/lib/i18n";
import { measureClientSync, startClientPerf } from "@/lib/perf-debug";
import type { Database } from "@/types/database";

type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];

type TimelineWindow = {
  start_date: string;
  end_date: string;
};

type TimelineProps = {
  season: SeasonRow | null;
  tripSegments: PortStopView[];
  visits: VisitView[];
  availabilityBlocks?: AvailabilityBlock[];
  title: string;
  subtitle: string;
  onVisitClick?: (visit: VisitView) => void;
  onVisitSelect?: (visit: VisitView) => void;
  onTripSegmentSelect?: (segment: PortStopView) => void;
  onTripSegmentEdit?: (segment: PortStopView) => void;
  selectedEntityId?: string | null;
  showVisits?: boolean;
  enableVisits?: boolean;
  showAvailability?: boolean;
  zoom?: number;
  visibleStartDate?: string;
  visibleEndDate?: string;
  visitsCollapsed?: boolean;
  availabilityCollapsed?: boolean;
  onlyShowTripPlan?: boolean;
  visitPanelDisplayMode?: VisitPanelDisplayMode;
  statusVisualTone?: "default" | "strong";
  hideHeader?: boolean;
  headerControls?: React.ReactNode;
};

type TimelineTooltipState = {
  content: string;
  x: number;
  y: number;
} | null;

const getTooltipPosition = (target: HTMLButtonElement) => {
  const rect = target.getBoundingClientRect();

  return {
    x: rect.right + 14,
    y: rect.top + rect.height / 2,
  };
};

const buildMonthMarkers = (window: TimelineWindow) => {
  const markers: { label: string; offset: number }[] = [];
  const dayMarkers: { label: string; offset: number }[] = [];
  const totalDays = diffDaysInclusive(window.start_date, window.end_date);
  const current = new Date(`${window.start_date}T00:00:00Z`);
  current.setUTCDate(1);

  while (current <= new Date(`${window.end_date}T00:00:00Z`)) {
    const markerDate = current.toISOString().slice(0, 10);
    if (markerDate >= window.start_date && markerDate <= window.end_date) {
      const offset =
        ((diffDaysInclusive(window.start_date, markerDate) - 1) / totalDays) * 100;
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
      if (dayLabel >= window.start_date && dayLabel <= window.end_date) {
        const offset =
          ((diffDaysInclusive(window.start_date, dayLabel) - 1) / totalDays) * 100;
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

const toBarStyle = (window: TimelineWindow, start: string, end: string) => {
  const totalDays = diffDaysInclusive(window.start_date, window.end_date);
  const startOffset =
    ((diffDaysInclusive(window.start_date, start) - 1) / totalDays) * 100;
  const width = (diffDaysInclusive(start, end) / totalDays) * 100;

  return {
    left: `${startOffset}%`,
    width: `${Math.max(width, 1.2)}%`,
  };
};

const resolveTimelineWindow = (
  season: SeasonRow,
  visibleStartDate?: string,
  visibleEndDate?: string,
): TimelineWindow => {
  const start_date = visibleStartDate ?? season.start_date;
  const end_date = visibleEndDate ?? season.end_date;

  return start_date <= end_date
    ? { start_date, end_date }
    : { start_date: season.start_date, end_date: season.end_date };
};

const availabilityOrder: AvailabilityBlock["status"][] = [
  "blocked",
  "occupied",
  "tentative",
  "available",
  "undefined",
];

const timelineLegendStatuses = [
  "tentative",
  "planned",
  "confirmed",
  "active",
  "completed",
  "cancelled",
  "blocked",
  "available",
] as const;

const getShortName = (name: string | null) => {
  if (!name) return "Visit";
  return name.split(" ")[0] ?? name;
};

const getStatusGlyph = (status: string) => {
  switch (status) {
    case "confirmed":
    case "available":
      return "✓";
    case "tentative":
    case "planned":
      return "?";
    case "blocked":
      return "✕";
    case "cancelled":
    case "undefined":
      return "!";
    default:
      return "•";
  }
};

export const Timeline = ({
  season,
  tripSegments,
  visits,
  availabilityBlocks,
  title,
  onVisitClick,
  onVisitSelect,
  onTripSegmentSelect,
  onTripSegmentEdit,
  selectedEntityId,
  showVisits = true,
  enableVisits = true,
  showAvailability = true,
  zoom: controlledZoom,
  visibleStartDate,
  visibleEndDate,
  visitsCollapsed = false,
  availabilityCollapsed = false,
  onlyShowTripPlan = false,
  visitPanelDisplayMode = "both",
  statusVisualTone = "default",
  hideHeader = false,
  headerControls,
}: TimelineProps) => {
  const { t } = useI18n();
  const locale = getDocumentLocale();
  const availabilityLabel = locale === "es" ? "Disponibilidad" : "Availability";
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [selectedAvailabilityIndex, setSelectedAvailabilityIndex] = useState<number | null>(
    null,
  );
  const [tooltip, setTooltip] = useState<TimelineTooltipState>(null);
  const [previewVisit, setPreviewVisit] = useState<VisitView | null>(null);
  const tooltipTimeoutRef = useRef<number | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const longPressEntityRef = useRef<string | null>(null);
  const zoom = controlledZoom ?? 1;

  const derivedData = useMemo(() => {
    if (!season) {
      return {
        availability: [] as AvailabilityBlock[],
        regularVisits: [] as VisitView[],
        sortedAvailability: [] as AvailabilityBlock[],
        monthMarkers: [] as { label: string; offset: number }[],
        dayMarkers: [] as { label: string; offset: number }[],
        isTimelineEmpty: tripSegments.length === 0 && visits.length === 0,
      };
    }

    const resolvedTimelineWindow = resolveTimelineWindow(
      season,
      visibleStartDate,
      visibleEndDate,
    );

    return measureClientSync(
      "planning.timeline.derive",
      () => {
        const availability = availabilityBlocks ?? computeAvailabilityReport(season, tripSegments, visits).blocks;
        const regularVisits = visits.filter((visit) => visit.status !== "blocked");
        const sortedAvailability = [...availability].sort(
          (a, b) =>
            availabilityOrder.indexOf(a.status) - availabilityOrder.indexOf(b.status),
        );
        const { markers: monthMarkers, dayMarkers } = buildMonthMarkers(resolvedTimelineWindow);

        return {
          availability,
          regularVisits,
          sortedAvailability,
          monthMarkers,
          dayMarkers,
          isTimelineEmpty: tripSegments.length === 0 && visits.length === 0,
        };
      },
      {
        seasonId: season.id,
        tripSegments: tripSegments.length,
        visits: visits.length,
        reusedAvailability: Boolean(availabilityBlocks),
        zoom,
        windowStart: resolvedTimelineWindow.start_date,
        windowEnd: resolvedTimelineWindow.end_date,
      },
    );
  }, [availabilityBlocks, season, tripSegments, visits, visibleEndDate, visibleStartDate, zoom]);

  useEffect(() => {
    if (!season) {
      return;
    }

    const timing = startClientPerf("planning.timeline.commit", {
      seasonId: season.id,
      tripSegments: tripSegments.length,
      visits: visits.length,
      zoom,
      selectedEntityId: selectedEntityId ?? null,
    });

    const frame = window.requestAnimationFrame(() => {
      timing.end({
        expandedVisitId: expandedVisitId ?? null,
        selectedAvailabilityIndex,
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    expandedVisitId,
    season,
    selectedAvailabilityIndex,
    selectedEntityId,
    tripSegments.length,
    visits.length,
    zoom,
  ]);

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

  const timelineWindow = resolveTimelineWindow(season, visibleStartDate, visibleEndDate);

  const {
    regularVisits,
    sortedAvailability,
    monthMarkers,
    dayMarkers,
    isTimelineEmpty,
  } = derivedData;
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

    const { x, y } = getTooltipPosition(event.currentTarget);

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
    const { x, y } = getTooltipPosition(event.currentTarget);

    setTooltip((current) =>
      current
        ? {
            ...current,
            x,
            y,
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

  const clearLongPress = () => {
    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const beginLongPress = (
    event: ReactPointerEvent<HTMLButtonElement>,
    entityId: string,
    onEdit?: () => void,
  ) => {
    if (!onEdit || event.pointerType === "mouse") {
      return;
    }

    clearLongPress();
    longPressTimeoutRef.current = window.setTimeout(() => {
      longPressEntityRef.current = entityId;
      onEdit();
      longPressTimeoutRef.current = null;
    }, 420);
  };

  const consumeLongPress = (entityId: string) => {
    if (longPressEntityRef.current !== entityId) {
      return false;
    }

    longPressEntityRef.current = null;
    return true;
  };

  const hasActiveSelection = selectedEntityId !== null || selectedAvailabilityIndex !== null;

  return (
    <article
      className="timeline-card"
      data-has-selection={hasActiveSelection ? "true" : "false"}
      data-status-tone={statusVisualTone}
    >
      {(!hideHeader || headerControls) && (
        <div className="timeline-card__header">
          {!hideHeader && (
            <div>
              <div className="timeline-card__title-row">
                <h2>{title}</h2>
                <span className="timeline-card__season-dates">
                  {season.name} · {formatLongDate(timelineWindow.start_date)} – {formatLongDate(timelineWindow.end_date)}
                </span>
              </div>
            </div>
          )}
          {headerControls && (
            <div className="timeline-card__controls">{headerControls}</div>
          )}
        </div>
      )}

      <div className="timeline-legend" aria-label="Timeline status legend">
        {timelineLegendStatuses.map((status) => (
          <span className="timeline-legend__item" key={status}>
            <span className={`timeline-legend__swatch is-${status}`} aria-hidden="true" />
            <span>{t(`status.${status}` as never)}</span>
          </span>
        ))}
      </div>

      <div className="timeline">
        <div className="timeline__inner" style={{ width: `${zoom * 100}%` }}>
          {isTimelineEmpty ? (
            <div className="timeline__empty">
              <div className="timeline__empty-range">
                <span>{formatShortDate(timelineWindow.start_date)}</span>
                <span>{formatShortDate(timelineWindow.end_date)}</span>
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
                {tripSegments.map((segment) => {
                  return (
                    <button
                      key={segment.id}
                      className={`timeline-bar timeline-bar--btn timeline-bar--trip is-${segment.status}${selectedEntityId === segment.id ? " is-selected" : ""}`}
                      onDoubleClick={() => onTripSegmentEdit?.(segment)}
                      onPointerCancel={clearLongPress}
                      onPointerDown={(event) =>
                        beginLongPress(event, segment.id, () => onTripSegmentEdit?.(segment))
                      }
                      onPointerEnter={(event) =>
                        showTooltip(
                          event,
                          `${segment.location_label} · ${t(`status.${segment.status}` as never)} · ${formatShortDate(segment.start_date)} – ${formatShortDate(segment.end_date)}`,
                        )
                      }
                      onPointerLeave={() => {
                        hideTooltip();
                        clearLongPress();
                      }}
                      onPointerMove={moveTooltip}
                      onPointerUp={clearLongPress}
                      onClick={() => {
                        if (consumeLongPress(segment.id)) {
                          return;
                        }
                        onTripSegmentSelect?.(segment);
                      }}
                      style={toBarStyle(timelineWindow, segment.start_date, segment.end_date)}
                      type="button"
                    >
                      <span>{segment.location_label}</span>
                    </button>
                  );
                })}
              </TimelineLane>

              {!onlyShowTripPlan && (
                <>
                  {enableVisits ? (
                    <TimelineGroup
                      count={regularVisits.length}
                      open={!visitsCollapsed}
                      title={t("planning.visitsList")}
                    >
                      {showVisits && !visitsCollapsed && regularVisits.length === 0 ? (
                        <TimelineLane label={t("planning.visit")}>
                          <span />
                        </TimelineLane>
                      ) : null}
                      {showVisits && !visitsCollapsed
                        ? regularVisits.map((visit) => {
                            if (!hasVisitDateRange(visit)) {
                              return null;
                            }

                            return (
                              <TimelineLane
                                key={visit.id}
                                label={renderVisitIdentity(
                                  {
                                    ...visit,
                                    visitor_name: visit.visitor_name ? getShortName(visit.visitor_name) : visit.visitor_name,
                                  },
                                  t("planning.visit"),
                                  visitPanelDisplayMode,
                                  {
                                    badgeClassName: "timeline-visit-badge",
                                    badgeSize: 28,
                                    identityClassName: "timeline-visit-identity",
                                    imageOnlyClassName: "timeline-visit-identity timeline-visit-identity--image-only",
                                    interactiveBadge: true,
                                    onOpenImage: setPreviewVisit,
                                  },
                                )}
                              >
                                <button
                                  aria-expanded={expandedVisitId === visit.id}
                                  aria-label={`${t("planning.visit")}: ${getVisitDisplayName(visit, t("planning.visit"))}`}
                                  className={`timeline-bar timeline-bar--btn is-${visit.status}${expandedVisitId === visit.id || selectedEntityId === visit.id ? " is-selected" : ""}`}
                                  onDoubleClick={() => onVisitClick?.(visit)}
                                  onPointerCancel={clearLongPress}
                                  onPointerDown={(event) =>
                                    beginLongPress(event, visit.id, () => onVisitClick?.(visit))
                                  }
                                  onPointerEnter={(event) =>
                                    showTooltip(
                                      event,
                                      `${getVisitDisplayName(visit, t("planning.visit"))} · ${t(`status.${visit.status}` as never)} · ${formatShortDate(visit.embark_date)} – ${formatShortDate(visit.disembark_date)}`,
                                    )
                                  }
                                  onPointerLeave={() => {
                                    hideTooltip();
                                    clearLongPress();
                                  }}
                                  onPointerMove={moveTooltip}
                                  onPointerUp={clearLongPress}
                                  onClick={() => {
                                    if (consumeLongPress(visit.id)) {
                                      return;
                                    }
                                    toggleVisit(visit.id);
                                    onVisitSelect?.(visit);
                                  }}
                                  style={toBarStyle(timelineWindow, visit.embark_date, visit.disembark_date)}
                                  type="button"
                                >
                                  {renderVisitIdentity(visit, t("planning.visit"), visitPanelDisplayMode, {
                                    badgeClassName: "timeline-visit-badge",
                                    badgeSize: 28,
                                    identityClassName: "timeline-visit-identity",
                                    imageOnlyClassName: "timeline-visit-identity timeline-visit-identity--image-only",
                                  })}
                                </button>
                              </TimelineLane>
                            );
                          })
                        : null}
                    </TimelineGroup>
                  ) : null}

              <TimelineGroup
                count={sortedAvailability.length}
                open={!availabilityCollapsed}
                title={availabilityLabel}
              >
                {showAvailability && !availabilityCollapsed ? (
                  <TimelineLane availability>
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
                        onClick={() =>
                          setSelectedAvailabilityIndex((current) =>
                            current === index ? null : index,
                          )
                        }
                        style={toBarStyle(timelineWindow, block.start, block.end)}
                        type="button"
                      >
                        <span aria-hidden="true" className="timeline-bar__glyph">
                          {getStatusGlyph(block.status)}
                        </span>
                        <span>{t(`status.${block.status}` as never)}</span>
                      </button>
                    ))}
                  </TimelineLane>
                ) : null}
                </TimelineGroup>
                </>
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
              {renderVisitIdentity(expandedVisit, t("planning.visit"), "both", {
                badgeClassName: "timeline-visit-badge",
                badgeSize: 28,
                identityClassName: "timeline-visit-identity",
                imageOnlyClassName: "timeline-visit-identity timeline-visit-identity--image-only",
                interactiveBadge: true,
                onOpenImage: setPreviewVisit,
              })}
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
            {hasVisitDateRange(expandedVisit) ? (
              <span>
                {formatShortDate(expandedVisit.embark_date)} – {formatShortDate(expandedVisit.disembark_date)}
              </span>
            ) : null}
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

      {previewVisit?.image_url ? (
        <div
          className="image-preview-overlay"
          onClick={() => setPreviewVisit(null)}
          role="presentation"
        >
          <div className="image-preview-dialog" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="image-preview-dialog__header">
              <strong>{getVisitDisplayName(previewVisit, t("planning.visit"))}</strong>
              <button
                aria-label="Cerrar"
                className="modal__close"
                onClick={() => setPreviewVisit(null)}
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="image-preview-dialog__body">
              <NextImage
                alt={getVisitDisplayName(previewVisit, t("planning.visit"))}
                height={600}
                sizes="(max-width: 720px) 100vw, 720px"
                src={previewVisit.image_url}
                unoptimized
                width={720}
              />
            </div>
          </div>
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
  label?: React.ReactNode;
  children: React.ReactNode;
  availability?: boolean;
  highlight?: boolean;
}) => (
  <div className="timeline__lane">
    <div className="timeline__lane-label">{label ?? ""}</div>
    <div
      className={`timeline__lane-track${availability ? " timeline__lane-track--availability" : ""}${highlight ? " timeline__lane-track--highlight" : ""}`}
    >
      {children}
    </div>
  </div>
);

const TimelineGroup = ({
  title,
  count,
  open,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  children: React.ReactNode;
}) => (
  <section className={`timeline__group${open ? " is-open" : " is-collapsed"}`}>
    <div className="timeline__group-header">
      <strong>{title}</strong>
      <span className="timeline__group-count">{count}</span>
    </div>
    {open ? <div className="timeline__group-body">{children}</div> : null}
  </section>
);
