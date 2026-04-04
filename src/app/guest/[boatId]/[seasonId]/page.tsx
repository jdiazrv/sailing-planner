import Link from "next/link";

import { GuestFirstAccess } from "@/components/guest/guest-first-access";
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
  searchParams: Promise<{ view?: string; welcome?: string }>;
}) {
  const { boatId, seasonId } = await params;
  const { view, welcome } = await searchParams;
  const workspace = await getSeasonGuestWorkspace(boatId, seasonId);
  const canViewVisits = workspace.viewer.seasonGuestCanViewVisits !== false;
  const currentView = view === "visits" && canViewVisits ? "visits" : "trip";
  const shouldShowWelcome = welcome === "1";
  const creatorName = workspace.viewer.seasonGuestCreatorName?.trim() || "Alguien";
  const seasonName = workspace.selectedSeason?.name || "esta temporada";
  const expiresAt = workspace.viewer.seasonGuestExpiresAt
    ? new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(workspace.viewer.seasonGuestExpiresAt))
    : null;

  const conflicts = computeVisitConflicts(
    workspace.selectedSeason,
    workspace.tripSegments,
    workspace.visits,
  );

  return (
    <main className="shell shell--guest">
      {shouldShowWelcome ? (
        <GuestFirstAccess
          canViewVisits={canViewVisits}
          creatorName={creatorName}
          expiresAt={expiresAt}
          resetKey={`${boatId}:${workspace.selectedSeason?.id ?? ""}:${welcome ?? ""}`}
          seasonName={seasonName}
        />
      ) : null}

      <section className="guest-banner">
        <strong>Estas viendo el plan de temporada de {workspace.boat.name}</strong>
        <span className="muted">
          Explore tramos, timeline y, si el enlace lo permite, tambien las visitas previstas.
        </span>
      </section>

      <header className="boat-header" data-tour="guest-header">
        <div className="boat-header__title">
          <h1>{workspace.boat.name}</h1>
          {workspace.selectedSeason && (
            <p className="muted">{workspace.selectedSeason.name}</p>
          )}
        </div>
        <span className="status-pill status-pill--readonly">Solo lectura</span>
      </header>

      <nav className="section-nav" aria-label="Vista" data-tour="boat-nav">
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
        <p className="muted">
          Este enlace solo permite ver tramos de viaje. Las visitas quedan ocultas tambien en el
          timeline y en el mapa.
        </p>
      ) : null}

      {currentView === "trip" ? (
        <TripOverview
          season={workspace.selectedSeason}
          showVisits={canViewVisits}
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
