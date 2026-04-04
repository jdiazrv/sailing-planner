"use client";

import { useState } from "react";

import { MapPanel } from "@/components/planning/map-panel";
import { Timeline } from "@/components/planning/timeline";
import { useI18n } from "@/components/i18n/provider";
import type { BoatDetails, TripSegmentView } from "@/lib/planning";
import type { Database } from "@/types/database";

type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];

type TimelineCompareEntry = {
  boat: BoatDetails;
  season: SeasonRow | null;
  tripSegments: TripSegmentView[];
  ownerDisplayName?: string | null;
  label: string;
};

export function SharedTimelineCompare({
  ownEntry,
  selectedEntry,
}: {
  ownEntry: TimelineCompareEntry | null;
  selectedEntry: TimelineCompareEntry | null;
}) {
  const { t } = useI18n();
  const [showMap, setShowMap] = useState(false);
  const [zoom, setZoom] = useState(1);

  return (
    <>
      <div className="workspace-header__actions" style={{ margin: "0 0 1rem" }}>
        <button
          className="secondary-button"
          onClick={() => setShowMap((value) => !value)}
          type="button"
        >
          {showMap ? t("shared.hideMap") : t("shared.showMap")}
        </button>
      </div>

      {ownEntry?.season ? (
        <section className="workspace-grid workspace-grid--single">
          <Timeline
            onZoomChange={setZoom}
            onlyShowTripPlan={true}
            season={ownEntry.season}
            showAvailability={false}
            showVisits={false}
            subtitle=""
            title={ownEntry.label}
            tripSegments={ownEntry.tripSegments}
            visits={[]}
            zoom={zoom}
          />
        </section>
      ) : null}

      {selectedEntry?.season ? (
        <section className="workspace-grid workspace-grid--single">
          <Timeline
            onZoomChange={setZoom}
            onlyShowTripPlan={true}
            season={selectedEntry.season}
            showAvailability={false}
            showVisits={false}
            subtitle=""
            title={selectedEntry.label}
            tripSegments={selectedEntry.tripSegments}
            visits={[]}
            zoom={zoom}
          />
        </section>
      ) : null}

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
