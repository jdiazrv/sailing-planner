"use client";

import Link from "next/link";
import { useState } from "react";

import { useI18n } from "@/components/i18n/provider";
import { TripSegmentsManager } from "@/components/planning/trip-segments-manager";
import { VisitsManager } from "@/components/planning/visits-manager";
import type { TripSegmentView, VisitConflict, VisitView } from "@/lib/planning";
import type { Database } from "@/types/database";

type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];

export function DashboardOpenBoatSwitcher({
  boatId,
  canEdit,
  canShare,
  season,
  tripSegments,
  visits,
  conflicts,
  onSaveTripSegment,
  onDeleteTripSegment,
  onSaveVisit,
  onDeleteVisit,
}: {
  boatId: string;
  canEdit: boolean;
  canShare: boolean;
  season: SeasonRow;
  tripSegments: TripSegmentView[];
  visits: VisitView[];
  conflicts: VisitConflict[];
  onSaveTripSegment: (fd: FormData) => Promise<void>;
  onDeleteTripSegment: (fd: FormData) => Promise<void>;
  onSaveVisit: (fd: FormData) => Promise<void>;
  onDeleteVisit: (fd: FormData) => Promise<void>;
}) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"trip" | "visits">("trip");

  return (
    <div className="stack">
      <nav className="section-nav" data-tour="boat-nav">
        <button
          className={activeTab === "trip" ? "is-active" : undefined}
          onClick={() => setActiveTab("trip")}
          type="button"
        >
          {t("boatNav.trip")}
        </button>
        <button
          className={activeTab === "visits" ? "is-active" : undefined}
          onClick={() => setActiveTab("visits")}
          type="button"
        >
          {t("boatNav.visits")}
        </button>
        {canShare ? (
          <Link href={`/boats/${boatId}/share`}>
            {t("boatNav.share")}
          </Link>
        ) : null}
      </nav>

      {activeTab === "trip" ? (
        <article className="dashboard-card" data-tour="boat-detail">
          <div className="card-header">
            <div>
              <p className="eyebrow">{t("planning.tripSegments")}</p>
              <h2>
                {t("planning.routeBlocks")} — {season.name}
              </h2>
            </div>
          </div>

          <TripSegmentsManager
            boatId={boatId}
            canEdit={canEdit}
            onDelete={onDeleteTripSegment}
            onSave={onSaveTripSegment}
            seasonId={season.id}
            seasonStart={season.start_date}
            segments={tripSegments}
          />
        </article>
      ) : (
        <div className="stack">
          <article className="dashboard-card" data-tour="boat-visits-card">
            <div className="card-header">
              <div>
                <p className="eyebrow">{t("planning.visitsList")}</p>
                <h2>{season.name}</h2>
              </div>
            </div>

            <VisitsManager
              boatId={boatId}
              canEdit={canEdit}
              onDelete={onDeleteVisit}
              onSave={onSaveVisit}
              seasonId={season.id}
              seasonStart={season.start_date}
              visits={visits}
            />
          </article>

          {conflicts.length > 0 ? (
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
          ) : null}
        </div>
      )}
    </div>
  );
}
