"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { useI18n } from "@/components/i18n/provider";
import { Timeline } from "@/components/planning/timeline";
import type { TripSegmentView, VisitView } from "@/lib/planning";
import type { Database } from "@/types/database";

type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];

const LazyMapPanel = dynamic(
  () => import("@/components/planning/map-panel").then((module) => module.MapPanel),
  {
    loading: () => <MapPanelPlaceholder />,
  },
);

export function TripOverview({
  season,
  tripSegments,
  visits,
  showVisits = true,
  children,
}: {
  season: SeasonRow | null;
  tripSegments: TripSegmentView[];
  visits: VisitView[];
  showVisits?: boolean;
  children?: ReactNode;
}) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"segments" | "map">("segments");
  const [shouldRenderMap, setShouldRenderMap] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setShouldRenderMap(true);
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <>
      <section className="workspace-grid workspace-grid--single">
        <div className="workspace-main" data-tour="boat-timeline">
          <Timeline
            onTripSegmentSelect={(segment) => setSelectedEntityId(segment.id)}
            onVisitSelect={showVisits ? (visit) => setSelectedEntityId(visit.id) : undefined}
            season={season}
            selectedEntityId={selectedEntityId}
            showVisits={showVisits}
            subtitle=""
            title={t("planning.timelineTitle")}
            tripSegments={tripSegments}
            visits={showVisits ? visits : []}
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
          onClick={() => {
            setShouldRenderMap(true);
            setMobilePanel("map");
          }}
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
          {shouldRenderMap ? (
            <LazyMapPanel
              dataTour="boat-map"
              onSelectEntity={({ entityId }) => setSelectedEntityId(entityId)}
              selectedEntityId={selectedEntityId}
              tall
              title={t("planning.tripAndVisitPlaces")}
              tripSegments={tripSegments}
              visits={showVisits ? visits : []}
            />
          ) : (
            <MapPanelPlaceholder />
          )}
        </aside>
      </section>
    </>
  );
}

function MapPanelPlaceholder() {
  const { t } = useI18n();

  return (
    <article className="dashboard-card map-panel map-panel--tall">
      <div className="card-header">
        <div>
          <p className="eyebrow">{t("planning.map")}</p>
          <h2>{t("planning.loadingMap")}</h2>
        </div>
      </div>
      <div className="map-empty">{t("planning.loadingMap")}</div>
    </article>
  );
}
