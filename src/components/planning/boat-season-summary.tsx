import Image from "next/image";

import { MapPanel } from "@/components/planning/map-panel";
import { getIntlLocale, t, type Locale } from "@/lib/i18n";
import {
  diffDaysInclusive,
  getVisitDisplayName,
  hasVisitDateRange,
  nauticalMilesBetweenPoints,
  parseDate,
  sortTripSegmentsBySchedule,
  sortVisitsBySchedule,
  type PortStopView,
  type SeasonRow,
  type VisitView,
} from "@/lib/planning";

type BoatSeasonSummaryProps = {
  canViewVisits: boolean;
  locale: Locale;
  season: SeasonRow;
  tripSegments: PortStopView[];
  visits: VisitView[];
};

type RouteLeg = {
  distanceNm: number | null;
  fromLabel: string | null;
  toLabel: string;
};

const formatDate = (value: string, locale: Locale) =>
  new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseDate(value));

const formatDateRange = (
  start: string | null,
  end: string | null,
  locale: Locale,
) => {
  if (!start || !end) {
    return t(locale, "summary.tbd");
  }

  return `${formatDate(start, locale)} – ${formatDate(end, locale)}`;
};

const getLocationTypeLabel = (
  locale: Locale,
  locationType: PortStopView["location_type"],
) => t(locale, `planning.${locationType}` as never);

const getStatusLabel = (locale: Locale, status: string) =>
  t(locale, `status.${status}` as never);

// Inline SVG icons — no extra dependency
function IconCalendar() {
  return (
    <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" viewBox="0 0 24 24" width="16">
      <rect height="18" rx="2" width="18" x="3" y="4" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" viewBox="0 0 24 24" width="16">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function IconAnchor() {
  return (
    <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" viewBox="0 0 24 24" width="16">
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v14M5 11h14M5 21c0-3 3-5 7-5s7 2 7 5" />
    </svg>
  );
}

function IconCompass() {
  return (
    <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" viewBox="0 0 24 24" width="16">
      <circle cx="12" cy="12" r="9" />
      <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" viewBox="0 0 24 24" width="16">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function BoatSeasonSummary({
  canViewVisits,
  locale,
  season,
  tripSegments,
  visits,
}: BoatSeasonSummaryProps) {
  const orderedSegments = sortTripSegmentsBySchedule(tripSegments);
  const visibleVisits = canViewVisits
    ? sortVisitsBySchedule(visits.filter((visit) => visit.status !== "blocked"))
    : [];
  const routeLegs = orderedSegments.map<RouteLeg>((segment, index) => {
    const previous = orderedSegments[index - 1];

    return {
      distanceNm: previous
        ? nauticalMilesBetweenPoints(
            previous.latitude,
            previous.longitude,
            segment.latitude,
            segment.longitude,
          )
        : null,
      fromLabel: previous?.location_label ?? null,
      toLabel: segment.location_label,
    };
  });
  const totalDistanceNm = routeLegs.reduce(
    (total, leg) => total + (leg.distanceNm ?? 0),
    0,
  );
  const routeLocations = new Set(
    orderedSegments.map((segment) => segment.location_label).filter(Boolean),
  ).size;
  const seasonDays = diffDaysInclusive(season.start_date, season.end_date);
  const seasonWindow = formatDateRange(season.start_date, season.end_date, locale);

  return (
    <section className="stack route-summary">

      {/* ── Hero ── */}
      <header className="dashboard-card route-summary__hero" role="banner">
        <div className="route-summary__hero-copy">
          <p className="eyebrow">{t(locale, "summary.eyebrow")}</p>
          <div className="route-summary__hero-meta">
            <span>{seasonWindow}</span>
            <span>
              {t(locale, "summary.daysCount").replace("{count}", String(seasonDays))}
            </span>
            <span>
              {t(locale, "summary.trackedLocations").replace("{count}", String(routeLocations))}
            </span>
            <span>{Math.round(totalDistanceNm)} nm</span>
          </div>
        </div>
      </header>


      {/* ── Stats ── */}
      <section className="route-summary__stats" aria-label={t(locale, "summary.snapshot")}>
        <article className="dashboard-card route-summary__stat-card">
          <div className="route-summary__stat-icon"><IconCalendar /></div>
          <p className="eyebrow">{t(locale, "summary.window")}</p>
          <strong>{seasonWindow}</strong>
        </article>
        <article className="dashboard-card route-summary__stat-card">
          <div className="route-summary__stat-icon"><IconClock /></div>
          <p className="eyebrow">{t(locale, "summary.duration")}</p>
          <strong>{t(locale, "summary.daysCount").replace("{count}", String(seasonDays))}</strong>
        </article>
        <article className="dashboard-card route-summary__stat-card">
          <div className="route-summary__stat-icon"><IconAnchor /></div>
          <p className="eyebrow">{t(locale, "summary.routeBlocks")}</p>
          <strong>
            {t(locale, "summary.trackedLocations").replace("{count}", String(routeLocations))}
          </strong>
        </article>
        <article className="dashboard-card route-summary__stat-card">
          <div className="route-summary__stat-icon"><IconCompass /></div>
          <p className="eyebrow">{t(locale, "summary.totalMiles")}</p>
          <strong>{Math.round(totalDistanceNm)} nm</strong>
        </article>
        {canViewVisits ? (
          <article className="dashboard-card route-summary__stat-card">
            <div className="route-summary__stat-icon"><IconUsers /></div>
            <p className="eyebrow">{t(locale, "summary.visits")}</p>
            <strong>{visibleVisits.length}</strong>
          </article>
        ) : null}
      </section>

      {/* ── Ruta + Mapa ── */}
      <section className="route-summary__grid">
        <article className="dashboard-card route-summary__panel">
          <div className="card-header">
            <div>
              <p className="eyebrow">{t(locale, "summary.routeSequence")}</p>
              <h2>{t(locale, "summary.routeSequenceTitle")}</h2>
            </div>
          </div>

          {orderedSegments.length ? (
            <div
              className={`route-summary__route-list${orderedSegments.length > 10 ? " route-summary__route-list--scrollable" : ""}`}
            >
              {orderedSegments.map((segment, index) => {
                const leg = routeLegs[index];
                const isLast = index === orderedSegments.length - 1;

                return (
                  <article className="route-summary__route-item" key={segment.id}>
                    {/* Stepper column */}
                    <div className="route-summary__route-step">
                      <div className="route-summary__route-order">{index + 1}</div>
                      {!isLast && <div className="route-summary__route-connector" aria-hidden="true" />}
                    </div>

                    <div className="route-summary__route-body">
                      <div className="route-summary__route-top">
                        <div className="route-summary__route-line route-summary__route-line--primary">
                          <strong>{segment.location_label}</strong>
                          <span>{getLocationTypeLabel(locale, segment.location_type)}</span>
                          <span>{formatDateRange(segment.start_date, segment.end_date, locale)}</span>
                        </div>
                      </div>

                      <div className="route-summary__route-line route-summary__route-line--secondary">
                        <span className={`status-pill is-${segment.status}`}>
                          {getStatusLabel(locale, segment.status)}
                        </span>
                        {leg.distanceNm != null && leg.fromLabel ? (
                          <span className="route-summary__route-meta">
                            {t(locale, "summary.legFrom").replace("{from}", leg.fromLabel)}
                            {": "}
                            {Math.round(leg.distanceNm)} nm
                          </span>
                        ) : null}
                        {segment.public_notes ? (
                          <span className="route-summary__notes">{segment.public_notes}</span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="route-summary__empty">
              <p className="muted">{t(locale, "summary.noRoute")}</p>
            </div>
          )}
        </article>

        <div className="route-summary__map-panel">
          <MapPanel
            deemphasized
            title={t(locale, "summary.mapTitle")}
            tripSegments={orderedSegments}
            visits={canViewVisits ? visibleVisits.filter(hasVisitDateRange) : []}
          />
        </div>
      </section>

      {/* ── Visitas ── */}
      {canViewVisits ? (
        <article className="dashboard-card route-summary__panel">
          <div className="card-header">
            <div>
              <p className="eyebrow">{t(locale, "summary.visits")}</p>
              <h2>{t(locale, "summary.visitsTitle")}</h2>
            </div>
          </div>

          {visibleVisits.length ? (
            <div className="route-summary__visit-grid">
              {visibleVisits.map((visit, index) => (
                <article className="route-summary__visit-card" key={visit.id}>
                  <div className="route-summary__visit-header">
                    {visit.image_url ? (
                      <Image
                        alt={getVisitDisplayName(visit, t(locale, "planning.visit"))}
                        className="route-summary__visit-image"
                        height={220}
                        priority={index === 0}
                        sizes="(max-width: 720px) 100vw, 180px"
                        src={visit.image_url}
                        width={180}
                      />
                    ) : (
                      <div className={`route-summary__visit-badge is-${visit.status}`}>
                        <span>{visit.badge_emoji ?? "-"}</span>
                      </div>
                    )}

                    <div className="route-summary__visit-copy">
                      <div className="route-summary__visit-topline">
                        <div>
                          <h3>{getVisitDisplayName(visit, t(locale, "planning.visit"))}</h3>
                          <p className="muted route-summary__visit-range">
                            {formatDateRange(visit.embark_date, visit.disembark_date, locale)}
                          </p>
                        </div>
                        <span className={`status-pill is-${visit.status}`}>
                          {getStatusLabel(locale, visit.status)}
                        </span>
                      </div>
                      <dl className="route-summary__visit-ports">
                        <div>
                          <dt>{t(locale, "planning.embarkPlace")}</dt>
                          <dd>{visit.embark_place_label ?? t(locale, "summary.tbd")}</dd>
                        </div>
                        <div>
                          <dt>{t(locale, "planning.disembarkPlace")}</dt>
                          <dd>{visit.disembark_place_label ?? t(locale, "summary.tbd")}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {visit.public_notes ? (
                    <p className="route-summary__notes">{visit.public_notes}</p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="route-summary__empty">
              <p className="muted">{t(locale, "planning.noVisitsEmpty")}</p>
            </div>
          )}
        </article>
      ) : null}
    </section>
  );
}
