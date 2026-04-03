"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { useI18n } from "@/components/i18n/provider";
import { MapPanel } from "@/components/planning/map-panel";
import { Timeline } from "@/components/planning/timeline";
import type { TripSegmentView, VisitView } from "@/lib/planning";
import type { Database } from "@/types/database";

type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];

export function TripOverview({
  season,
  tripSegments,
  visits,
  children,
}: {
  season: SeasonRow | null;
  tripSegments: TripSegmentView[];
  visits: VisitView[];
  children?: ReactNode;
}) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"segments" | "map">("segments");
  const { t } = useI18n();

  return (
    <>
      <section className="workspace-grid workspace-grid--single">
        <div className="workspace-main" data-tour="boat-timeline">
          <Timeline
            onTripSegmentSelect={(segment) => setSelectedEntityId(segment.id)}
            onVisitSelect={(visit) => setSelectedEntityId(visit.id)}
            season={season}
            selectedEntityId={selectedEntityId}
            subtitle=""
            title={t("planning.timelineTitle")}
            tripSegments={tripSegments}
            visits={visits}
          />
        </div>
      </section>

      <div
        aria-label={t("planning.tripSegments")}
        className="workspace-mobile-switch"
        role="tablist"
      >
        <button
          aria-selected={mobilePanel === "segments"}
          className={mobilePanel === "segments" ? "is-active" : undefined}
          onClick={() => setMobilePanel("segments")}
          role="tab"
          type="button"
        >
          {t("planning.tripSegments")}
        </button>
        <button
          aria-selected={mobilePanel === "map"}
          className={mobilePanel === "map" ? "is-active" : undefined}
          onClick={() => setMobilePanel("map")}
          role="tab"
          type="button"
        >
          {t("planning.map")}
        </button>
      </div>

      <section className="workspace-grid workspace-grid--trip workspace-grid--mobile-panels">
        <div
          className={`workspace-main workspace-panel${mobilePanel === "segments" ? " is-active" : ""}`}
          data-tour="boat-detail"
        >
          {children}
        </div>
        <aside
          className={`stack workspace-panel${mobilePanel === "map" ? " is-active" : ""}`}
        >
          <MapPanel
            dataTour="boat-map"
            selectedEntityId={selectedEntityId}
            tall
            title={t("planning.tripAndVisitPlaces")}
            tripSegments={tripSegments}
            visits={visits}
          />
        </aside>
      </section>
    </>
  );
}
