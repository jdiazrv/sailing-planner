import {
  computeAvailability,
  diffDaysInclusive,
  formatLongDate,
  formatShortDate,
  type AvailabilityBlock,
  type TripSegmentView,
  type VisitView,
} from "@/lib/planning";
import type { Database } from "@/types/database";

type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];

type TimelineProps = {
  season: SeasonRow | null;
  tripSegments: TripSegmentView[];
  visits: VisitView[];
  title: string;
  subtitle: string;
};

const layerTitle: Record<string, string> = {
  confirmed: "Confirmed",
  planned: "Planned",
  tentative: "Tentative",
  cancelled: "Cancelled",
  occupied: "Occupied",
  available: "Available",
  undefined: "Undefined",
  active: "Active",
  completed: "Completed",
};

const buildMonthMarkers = (season: SeasonRow) => {
  const markers: { label: string; offset: number }[] = [];
  const totalDays = diffDaysInclusive(season.start_date, season.end_date);
  const current = new Date(`${season.start_date}T00:00:00Z`);
  current.setUTCDate(1);

  while (current <= new Date(`${season.end_date}T00:00:00Z`)) {
    const markerDate = current.toISOString().slice(0, 10);
    if (markerDate >= season.start_date && markerDate <= season.end_date) {
      const offset =
        ((diffDaysInclusive(season.start_date, markerDate) - 1) / totalDays) * 100;
      markers.push({
        label: current.toLocaleString("en", { month: "short" }),
        offset,
      });
    }
    current.setUTCMonth(current.getUTCMonth() + 1);
  }

  return markers;
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

export const Timeline = ({
  season,
  tripSegments,
  visits,
  title,
  subtitle,
}: TimelineProps) => {
  if (!season) {
    return (
      <article className="timeline-card">
        <div className="timeline-card__header">
          <div>
            <p className="eyebrow">{title}</p>
            <h2>No season selected</h2>
          </div>
          <p className="muted">{subtitle}</p>
        </div>
      </article>
    );
  }

  const availability = computeAvailability(season, tripSegments, visits);
  const monthMarkers = buildMonthMarkers(season);

  return (
    <article className="timeline-card">
      <div className="timeline-card__header">
        <div>
          <p className="eyebrow">{title}</p>
          <h2>{season.name}</h2>
        </div>
        <p className="muted">
          {subtitle} · {formatLongDate(season.start_date)} to{" "}
          {formatLongDate(season.end_date)}
        </p>
      </div>

      <div className="timeline">
        <div className="timeline__scale">
          {monthMarkers.map((marker) => (
            <span key={`${marker.label}-${marker.offset}`} style={{ left: `${marker.offset}%` }}>
              {marker.label}
            </span>
          ))}
        </div>

        <TimelineLane label="Trip plan">
          {tripSegments.map((segment) => (
            <div
              className={`timeline-bar is-${segment.status}`}
              key={segment.id}
              style={toBarStyle(season, segment.start_date, segment.end_date)}
              title={`${segment.location_label} · ${layerTitle[segment.status] ?? segment.status}`}
            >
              <span>{segment.location_label}</span>
            </div>
          ))}
        </TimelineLane>

        <TimelineLane label="Visits">
          {visits.map((visit) => (
            <div
              className={`timeline-bar is-${visit.status}`}
              key={visit.id}
              style={toBarStyle(season, visit.embark_date, visit.disembark_date)}
              title={`${visit.visitor_name ?? "Private visit"} · ${layerTitle[visit.status]}`}
            >
              <span>{visit.visitor_name ?? "Private visit"}</span>
            </div>
          ))}
        </TimelineLane>

        <TimelineLane label="Availability">
          {availability
            .sort(
              (left, right) =>
                availabilityOrder.indexOf(left.status) -
                availabilityOrder.indexOf(right.status),
            )
            .map((block, index) => (
              <div
                className={`timeline-bar is-${block.status}`}
                key={`${block.status}-${index}-${block.start}`}
                style={toBarStyle(season, block.start, block.end)}
                title={`${block.label} · ${formatShortDate(block.start)} to ${formatShortDate(block.end)}`}
              >
                <span>{block.label}</span>
              </div>
            ))}
        </TimelineLane>
      </div>
    </article>
  );
};

const TimelineLane = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="timeline__lane">
    <div className="timeline__lane-label">{label}</div>
    <div className="timeline__lane-track">{children}</div>
  </div>
);
