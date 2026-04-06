import Link from "next/link";

import { GuestFirstAccess } from "@/components/guest/guest-first-access";
import { BoatSeasonSummary } from "@/components/planning/boat-season-summary";
import { getSeasonGuestWorkspace } from "@/lib/boat-data";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function GuestSeasonSummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ boatId: string; seasonId: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { boatId, seasonId } = await params;
  const { welcome } = await searchParams;
  const locale = await getRequestLocale();
  const workspace = await getSeasonGuestWorkspace(boatId, seasonId);
  const canViewVisits = workspace.viewer.seasonGuestCanViewVisits !== false;
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
        <strong>Estas viendo el resumen de temporada de {workspace.boat.name}</strong>
        <span className="muted">
          {canViewVisits
            ? "Consulta ruta, mapa operativo y visitas visibles con el mismo acceso de solo lectura."
            : "Consulta ruta y mapa operativo con el mismo acceso de solo lectura."}
        </span>
      </section>

      <header className="boat-header" data-tour="guest-header">
        <div className="boat-header__title">
          <h1>{workspace.boat.name}</h1>
          {workspace.selectedSeason ? (
            <p className="muted">{workspace.selectedSeason.name}</p>
          ) : null}
        </div>
        <span className="status-pill status-pill--readonly">Solo lectura</span>
      </header>

      <nav className="section-nav" aria-label="Vista" data-tour="boat-nav">
        <Link href={`/guest/${boatId}/${workspace.selectedSeason?.id ?? ""}?view=trip`}>
          Escalas
        </Link>
        <Link
          className="is-active"
          href={`/guest/${boatId}/${workspace.selectedSeason?.id ?? ""}/summary`}
        >
          Resumen
        </Link>
        {canViewVisits ? (
          <Link href={`/guest/${boatId}/${workspace.selectedSeason?.id ?? ""}?view=visits`}>
            Visitas
          </Link>
        ) : null}
      </nav>

      {workspace.selectedSeason ? (
        <BoatSeasonSummary
          boat={workspace.boat}
          canViewVisits={canViewVisits}
          locale={locale}
          season={workspace.selectedSeason}
          tripSegments={workspace.tripSegments}
          visits={workspace.visits}
        />
      ) : null}
    </main>
  );
}