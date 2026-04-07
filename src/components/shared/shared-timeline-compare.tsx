"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { MapPanel } from "@/components/planning/map-panel";
import { Timeline } from "@/components/planning/timeline";
import { useI18n } from "@/components/i18n/provider";
import type { BoatDetails, PortStopView } from "@/lib/planning";
import type { Database } from "@/types/database";

type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];

type SharedZoomPreset = "season" | "months" | "week";

type TimelineCompareEntry = {
  boat: BoatDetails;
  season: SeasonRow | null;
  tripSegments: PortStopView[];
  ownerDisplayName?: string | null;
  label: string;
};

const resolveSharedWindow = (
  entries: Array<TimelineCompareEntry | null>,
): { startDate: string; endDate: string } | null => {
  const seasons = entries
    .map((entry) => entry?.season)
    .filter((season): season is SeasonRow => Boolean(season));

  if (!seasons.length) {
    return null;
  }

  return {
    startDate: seasons.reduce(
      (current, season) => (season.start_date < current ? season.start_date : current),
      seasons[0].start_date,
    ),
    endDate: seasons.reduce(
      (current, season) => (season.end_date > current ? season.end_date : current),
      seasons[0].end_date,
    ),
  };
};

export function SharedTimelineCompare({
  ownEntry,
  selectedEntry,
  pickerSlot,
}: {
  ownEntry: TimelineCompareEntry | null;
  selectedEntry: TimelineCompareEntry | null;
  pickerSlot?: React.ReactNode;
}) {
  const { t } = useI18n();
  const [showMap, setShowMap] = useState(false);
  const [zoomPreset, setZoomPreset] = useState<SharedZoomPreset>("week");
  const ownTimelineHostRef = useRef<HTMLDivElement | null>(null);
  const selectedTimelineHostRef = useRef<HTMLDivElement | null>(null);
  const sharedWindow = useMemo(
    () => resolveSharedWindow([ownEntry, selectedEntry]),
    [ownEntry, selectedEntry],
  );

  const zoomOptions = useMemo(
    () => [
      { id: "season" as const, label: t("shared.zoomSeason") },
      { id: "months" as const, label: t("shared.zoomMonths") },
      { id: "week" as const, label: t("shared.zoomWeek") },
    ],
    [t],
  );

  const resolveZoom = () => {
    if (!sharedWindow) {
      return 1;
    }

    const start = new Date(`${sharedWindow.startDate}T00:00:00Z`);
    const end = new Date(`${sharedWindow.endDate}T00:00:00Z`);
    const totalDays = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 86400000) + 1,
    );

    switch (zoomPreset) {
      case "week":
        return Math.min(12, Math.max(1.8, totalDays / 7));
      case "months":
        return Math.min(5, Math.max(1.15, totalDays / 30));
      case "season":
      default:
        return 1;
    }
  };

  useEffect(() => {
    const ownTimeline = ownTimelineHostRef.current?.querySelector<HTMLDivElement>(".timeline");
    const selectedTimeline =
      selectedTimelineHostRef.current?.querySelector<HTMLDivElement>(".timeline");

    if (!ownTimeline || !selectedTimeline) {
      return;
    }

    let syncing = false;

    const syncScroll = (source: HTMLDivElement, target: HTMLDivElement) => {
      if (syncing || target.scrollLeft === source.scrollLeft) {
        return;
      }

      syncing = true;
      target.scrollLeft = source.scrollLeft;
      window.requestAnimationFrame(() => {
        syncing = false;
      });
    };

    selectedTimeline.scrollLeft = ownTimeline.scrollLeft;

    const handleOwnScroll = () => syncScroll(ownTimeline, selectedTimeline);
    const handleSelectedScroll = () => syncScroll(selectedTimeline, ownTimeline);

    ownTimeline.addEventListener("scroll", handleOwnScroll, { passive: true });
    selectedTimeline.addEventListener("scroll", handleSelectedScroll, { passive: true });

    return () => {
      ownTimeline.removeEventListener("scroll", handleOwnScroll);
      selectedTimeline.removeEventListener("scroll", handleSelectedScroll);
    };
  }, [ownEntry?.season?.id, selectedEntry?.season?.id, zoomPreset]);

  return (
    <>
      <article className="timeline-card shared-compare-card">
        <div className="timeline-card__header shared-compare-card__header">
          <div>
            <p className="eyebrow">{t("shared.title")}</p>
            <h2>{t("shared.subtitle")}</h2>
          </div>
        </div>

        <div className="shared-compare-toolbar">
          {pickerSlot ? <div className="shared-compare-picker-slot">{pickerSlot}</div> : null}
          <div className="shared-compare-controls">
            <div
              aria-label={t("shared.zoomLabel")}
              className="segmented-control shared-compare-controls__zoom"
              role="tablist"
            >
              {zoomOptions.map((option) => (
                <button
                  aria-selected={zoomPreset === option.id}
                  className={zoomPreset === option.id ? "is-active" : undefined}
                  key={option.id}
                  onClick={() => setZoomPreset(option.id)}
                  role="tab"
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              className="secondary-button"
              onClick={() => setShowMap((value) => !value)}
              type="button"
            >
              {showMap ? t("shared.hideMap") : t("shared.showMap")}
            </button>
          </div>
        </div>

        {ownEntry?.season ? (
          <div className="shared-compare-card__timeline" ref={ownTimelineHostRef}>
            <Timeline
              onlyShowTripPlan={true}
              season={ownEntry.season}
              showAvailability={false}
              showVisits={false}
              subtitle=""
              title={ownEntry.label}
              tripSegments={ownEntry.tripSegments}
              visibleEndDate={sharedWindow?.endDate}
              visibleStartDate={sharedWindow?.startDate}
              visits={[]}
              zoom={resolveZoom()}
            />
          </div>
        ) : null}

        {selectedEntry?.season ? (
          <div className="shared-compare-card__timeline" ref={selectedTimelineHostRef}>
            <Timeline
              onlyShowTripPlan={true}
              season={selectedEntry.season}
              showAvailability={false}
              showVisits={false}
              subtitle=""
              title={selectedEntry.label}
              tripSegments={selectedEntry.tripSegments}
              visibleEndDate={sharedWindow?.endDate}
              visibleStartDate={sharedWindow?.startDate}
              visits={[]}
              zoom={resolveZoom()}
            />
          </div>
        ) : null}
      </article>

      {showMap && (ownEntry?.season || selectedEntry?.season) ? (
        <section className="shared-compare-maps">
          {ownEntry?.season ? (
            <div className="shared-compare-maps__item">
              <MapPanel
                tall
                title={ownEntry.boat.name}
                tripSegments={ownEntry.tripSegments}
                visits={[]}
              />
            </div>
          ) : null}

          {selectedEntry?.season ? (
            <div className="shared-compare-maps__item">
              <MapPanel
                tall
                title={selectedEntry.boat.name}
                tripSegments={selectedEntry.tripSegments}
                visits={[]}
              />
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
