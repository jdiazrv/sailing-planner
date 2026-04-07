import Image from "next/image";

import { MapPanel } from "@/components/planning/map-panel";
import { SummaryActions } from "@/components/planning/summary-actions";
import { getIntlLocale, t, type Locale } from "@/lib/i18n";
import {
  diffDaysInclusive,
  getVisitDisplayName,
  hasVisitDateRange,
  nauticalMilesBetweenPoints,
  parseDate,
  sortTripSegmentsBySchedule,
  sortVisitsBySchedule,
  type BoatDetails,
  type PortStopView,
  type SeasonRow,
  type VisitView,
} from "@/lib/planning";

type BoatSeasonSummaryProps = {
  boat: BoatDetails;
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

  return `${formatDate(start, locale)} - ${formatDate(end, locale)}`;
};

const getLocationTypeLabel = (
  locale: Locale,
  locationType: PortStopView["location_type"],
) => t(locale, `planning.${locationType}` as never);

const getStatusLabel = (locale: Locale, status: string) =>
  t(locale, `status.${status}` as never);

const getBoatMetaItems = (boat: BoatDetails) =>
  [boat.model, boat.home_port, boat.year_built ? String(boat.year_built) : null].filter(
    Boolean,
  ) as string[];

export function BoatSeasonSummary({
  boat,
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
  const leadCopy = canViewVisits
    ? t(locale, "summary.lead")
    : t(locale, "summary.leadNoVisits");
  const boatMetaItems = getBoatMetaItems(boat);

  return (
    <section className="stack route-summary">
      <SummaryActions
        boat={boat}
        canViewVisits={canViewVisits}
        locale={locale}
        season={season}
        tripSegments={tripSegments}
        visits={visits}
      />

      <article className="dashboard-card route-summary__hero">
        <div className="route-summary__hero-copy">
          <p className="eyebrow">{t(locale, "summary.eyebrow")}</p>
          <h1>{boat.name}</h1>
          <p className="route-summary__season-name">{season.name}</p>
          {boatMetaItems.length ? (
            <div className="route-summary__hero-meta" aria-label={t(locale, "summary.boatMeta")}>
              {boatMetaItems.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}
          <p className="muted route-summary__lead">
            {leadCopy}
          </p>
        </div>
        {boat.image_url ? (
          <div className="route-summary__boat-media">
            <Image
              alt={boat.name}
              className="route-summary__boat-image"
              height={180}
              sizes="(max-width: 720px) 100vw, 240px"
              src={boat.image_url}
              width={240}
            />
          </div>
        ) : null}
      </article>

      <section className="route-summary__stats" aria-label={t(locale, "summary.snapshot")}>
        <article className="dashboard-card route-summary__stat-card">
          <p className="eyebrow">{t(locale, "summary.window")}</p>
          <strong>{seasonWindow}</strong>
        </article>
        <article className="dashboard-card route-summary__stat-card">
          <p className="eyebrow">{t(locale, "summary.duration")}</p>
          <strong>{t(locale, "summary.daysCount").replace("{count}", String(seasonDays))}</strong>
        </article>
        <article className="dashboard-card route-summary__stat-card">
          <p className="eyebrow">{t(locale, "summary.routeBlocks")}</p>
          <strong>{orderedSegments.length}</strong>
          <span className="muted">{t(locale, "summary.trackedLocations").replace("{count}", String(routeLocations))}</span>
        </article>
        <article className="dashboard-card route-summary__stat-card">
          <p className="eyebrow">{t(locale, "summary.totalMiles")}</p>
          <strong>{Math.round(totalDistanceNm)} nm</strong>
        </article>
        {canViewVisits ? (
          <article className="dashboard-card route-summary__stat-card">
            <p className="eyebrow">{t(locale, "summary.visits")}</p>
            <strong>{visibleVisits.length}</strong>
          </article>
        ) : null}
      </section>

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

                return (
                  <article className="route-summary__route-item" key={segment.id}>
                    <div className="route-summary__route-order">{index + 1}</div>
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
            <p className="muted">{t(locale, "summary.noRoute")}</p>
          )}
        </article>

        <article className="dashboard-card route-summary__panel route-summary__map-panel">
          <div className="card-header">
            <div>
              <p className="eyebrow">{t(locale, "planning.map")}</p>
              <h2>{t(locale, "summary.mapTitle")}</h2>
            </div>
          </div>

          <MapPanel
            deemphasized
            title={t(locale, "summary.mapTitle")}
            tripSegments={orderedSegments}
            visits={canViewVisits ? visibleVisits.filter(hasVisitDateRange) : []}
          />
        </article>
      </section>

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
              {visibleVisits.map((visit) => (
                <article className="route-summary__visit-card" key={visit.id}>
                  <div className="route-summary__visit-header">
                    {visit.image_url ? (
                      <Image
                        alt={getVisitDisplayName(visit, t(locale, "planning.visit"))}
                        className="route-summary__visit-image"
                        height={200}
                        sizes="150px"
                        src={visit.image_url}
                        width={150}
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
            <p className="muted">{t(locale, "planning.noVisitsEmpty")}</p>
          )}
        </article>
      ) : null}
    </section>
  );
}