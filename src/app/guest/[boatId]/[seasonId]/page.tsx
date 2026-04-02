import Link from "next/link";

import { TripOverview } from "@/components/planning/trip-overview";
import { TripSegmentsManager } from "@/components/planning/trip-segments-manager";
import { VisitsWorkspace } from "@/components/planning/visits-workspace";
import { getSeasonGuestWorkspace } from "@/lib/boat-data";
import { computeVisitConflicts } from "@/lib/planning";

// No-op server actions for read-only guest view
async function noop(_fd: FormData): Promise<void> {
  "use server";
  void _fd;
}

export default async function GuestSeasonPage({
  params,
  searchParams,
}: {
  params: Promise<{ boatId: string; seasonId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { boatId } = await params;
  const { view } = await searchParams;
  const workspace = await getSeasonGuestWorkspace(boatId);
  const canViewVisits = workspace.viewer.seasonGuestCanViewVisits !== false;
  const currentView = view === "visits" && canViewVisits ? "visits" : "trip";

  const conflicts = computeVisitConflicts(
    workspace.selectedSeason,
    workspace.tripSegments,
    workspace.visits,
  );

  return (
    <main>
      <header className="boat-header">
        <div className="boat-header__title">
          <h1>{workspace.boat.name}</h1>
          {workspace.selectedSeason && (
            <p className="muted">{workspace.selectedSeason.name}</p>
          )}
        </div>
        <span className="status-pill is-muted">Solo lectura</span>
      </header>

      <nav className="section-nav" aria-label="Vista">
        <Link
          className={currentView === "trip" ? "is-active" : undefined}
          href={`/guest/${boatId}/${workspace.selectedSeason?.id ?? ""}?view=trip`}
        >
          Tramos
        </Link>
        {canViewVisits ? (
          <Link
            className={currentView === "visits" ? "is-active" : undefined}
            href={`/guest/${boatId}/${workspace.selectedSeason?.id ?? ""}?view=visits`}
          >
            Visitas
          </Link>
        ) : null}
      </nav>

      {!canViewVisits ? (
        <p className="muted">Este enlace solo permite ver tramos de viaje.</p>
      ) : null}

      {currentView === "trip" ? (
        <TripOverview
          season={workspace.selectedSeason}
          tripSegments={workspace.tripSegments}
          visits={workspace.visits}
        >
          <article className="dashboard-card workspace-main">
            <div className="card-header">
              <div>
                <p className="eyebrow">Plan</p>
                <h2>Tramos de viaje</h2>
              </div>
            </div>

            <TripSegmentsManager
              boatId={boatId}
              canEdit={false}
              onDelete={noop}
              onSave={noop}
              seasonId={workspace.selectedSeason?.id ?? ""}
              seasonStart={workspace.selectedSeason?.start_date ?? ""}
              segments={workspace.tripSegments}
            />
          </article>
        </TripOverview>
      ) : null}

      {currentView === "visits" && canViewVisits ? (
        <VisitsWorkspace
          boatId={boatId}
          canEdit={false}
          conflicts={conflicts}
          onDelete={noop}
          onSave={noop}
          season={workspace.selectedSeason}
          seasonId={workspace.selectedSeason?.id ?? null}
          seasonStart={workspace.selectedSeason?.start_date ?? ""}
          tripSegments={workspace.tripSegments}
          visits={workspace.visits}
        />
      ) : null}
    </main>
  );
}
