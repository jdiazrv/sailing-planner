"use client";

import { useState } from "react";

import { useI18n } from "@/components/i18n/provider";
import { MapPanel } from "@/components/planning/map-panel";
import { Timeline } from "@/components/planning/timeline";
import { VisitsManager } from "@/components/planning/visits-manager";
import type { VisitConflict, TripSegmentView, VisitView } from "@/lib/planning";
import type { Database } from "@/types/database";

type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];

type Props = {
  season: SeasonRow | null;
  tripSegments: TripSegmentView[];
  visits: VisitView[];
  conflicts: VisitConflict[];
  boatId: string;
  seasonId: string | null;
  seasonStart: string;
  canEdit: boolean;
  statusFilter?: string;
  queryFilter?: string;
  onSave: (fd: FormData) => Promise<void>;
  onDelete: (fd: FormData) => Promise<void>;
};

export function VisitsWorkspace({
  season,
  tripSegments,
  visits,
  conflicts,
  boatId,
  seasonId,
  seasonStart,
  canEdit,
  statusFilter,
  queryFilter,
  onSave,
  onDelete,
}: Props) {
  const { t } = useI18n();
  const [timelineEditVisit, setTimelineEditVisit] = useState<VisitView | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(
    Boolean(statusFilter) || Boolean(queryFilter),
  );
  const [mobilePanel, setMobilePanel] = useState<"visits" | "timeline" | "map">(
    "visits",
  );

  return (
    <>
      <div
        aria-label={t("planning.visitsList")}
        className="workspace-mobile-switch"
        role="tablist"
      >
        <button
          aria-selected={mobilePanel === "visits"}
          className={mobilePanel === "visits" ? "is-active" : undefined}
          onClick={() => setMobilePanel("visits")}
          role="tab"
          type="button"
        >
          {t("planning.visitsList")}
        </button>
        <button
          aria-selected={mobilePanel === "timeline"}
          className={mobilePanel === "timeline" ? "is-active" : undefined}
          onClick={() => setMobilePanel("timeline")}
          role="tab"
          type="button"
        >
          {t("planning.timeline")}
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

      <section
        className={`workspace-grid workspace-grid--single workspace-panel workspace-panel--standalone${mobilePanel === "timeline" ? " is-active" : ""}`}
        data-tour="boat-timeline"
      >
        <Timeline
          onVisitClick={canEdit ? setTimelineEditVisit : undefined}
          onVisitSelect={(visit) => setSelectedEntityId(visit.id)}
          season={season}
          selectedEntityId={selectedEntityId}
          subtitle=""
          title={t("planning.timeline")}
          tripSegments={tripSegments}
          visits={visits}
        />
      </section>

      <section
        className={`workspace-grid workspace-grid--single workspace-panel workspace-panel--filters${mobilePanel === "visits" ? " is-active" : ""}`}
      >
        <article className="dashboard-card workspace-main">
          <div className="card-header">
            <div>
              <p className="eyebrow">{t("planning.visitsList")}</p>
              <h2>
                {season ? season.name : t("planning.noSeasonSelected")}
              </h2>
            </div>
            <button
              className="link-button"
              onClick={() => setShowFilters((value) => !value)}
              type="button"
            >
              {showFilters ? `${t("planning.filter")} ↑` : t("planning.filter")}
            </button>
          </div>

          {showFilters && (
            <form className="editor-form editor-form--dense" method="get">
              {seasonId && (
                <input name="season" type="hidden" value={seasonId} />
              )}
              <div className="form-grid">
                <label className="form-grid__wide">
                  <span>{t("planning.search")}</span>
                  <input
                    defaultValue={queryFilter ?? ""}
                    name="q"
                    placeholder={t("planning.searchVisitsPlaceholder")}
                  />
                </label>
                <label className="form-grid__wide">
                  <span>{t("planning.status")}</span>
                  <select defaultValue={statusFilter ?? ""} name="status">
                    <option value="">{t("planning.allStatuses")}</option>
                    <option value="tentative">{t("status.tentative")}</option>
                    <option value="confirmed">{t("status.confirmed")}</option>
                    <option value="cancelled">{t("status.cancelled")}</option>
                  </select>
                </label>
              </div>
              <button className="link-button" type="submit">
                {t("planning.applyFilters")}
              </button>
            </form>
          )}
        </article>
      </section>

      <section className="workspace-grid workspace-grid--visits workspace-grid--mobile-panels">
        <article
          className={`dashboard-card workspace-main workspace-panel${mobilePanel === "visits" ? " is-active" : ""}`}
          data-tour="boat-detail"
        >
          {season && seasonId ? (
            <VisitsManager
              boatId={boatId}
              canEdit={canEdit}
              emptyMessage={
                statusFilter || queryFilter ? t("planning.noVisitsMatch") : t("planning.noVisitsEmpty")
              }
              externalEditVisit={timelineEditVisit}
              onDelete={onDelete}
              onExternalEditHandled={() => setTimelineEditVisit(null)}
              onSave={onSave}
              seasonId={seasonId}
              seasonStart={seasonStart}
              visits={visits}
            />
          ) : (
            <p className="muted">{t("planning.noSeasonSelected")}</p>
          )}
        </article>

        <aside
          className={`stack workspace-panel${mobilePanel === "map" ? " is-active" : ""}`}
          data-tour="boat-map"
        >
          <MapPanel
            selectedEntityId={selectedEntityId}
            tall
            title={t("planning.tripAndVisitPlaces")}
            tripSegments={tripSegments}
            visits={visits}
          />

          {conflicts.length > 0 && (
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
          )}
        </aside>
      </section>
    </>
  );
}
