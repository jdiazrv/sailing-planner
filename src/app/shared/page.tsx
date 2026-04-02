import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { MapPanel } from "@/components/planning/map-panel";
import { Timeline } from "@/components/planning/timeline";
import { TimelineVisibilityPanel } from "@/components/shared/timeline-visibility-panel";
import { getSharedTimelineWorkspace } from "@/lib/boat-data";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function SharedPage({
  searchParams,
}: {
  searchParams: Promise<{ boat?: string; season?: string }>;
}) {
  const locale = await getRequestLocale();
  const { boat, season } = await searchParams;
  try {
    const workspace = await getSharedTimelineWorkspace(boat, season);
  const selected = workspace.selectedBoat;

  return (
    <main className="shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">{t(locale, "dashboard.sharedTimelines")}</p>
          <h1>{t(locale, "shared.title")}</h1>
          <p className="muted">{t(locale, "shared.subtitle")}</p>
        </div>
        <div className="workspace-header__actions">
          <Link className="secondary-button" href="/dashboard?change=1">
            {t(locale, "common.dashboard")}
          </Link>
          <LogoutButton />
        </div>
      </header>

      {!workspace.viewer.isSuperuser && !workspace.viewer.profile?.is_timeline_public ? (
        <TimelineVisibilityPanel isPublic={false} />
      ) : workspace.boats.length === 0 ? (
        <article className="dashboard-card">
          <p className="eyebrow">{t(locale, "shared.emptyTitle")}</p>
          <p className="muted">{t(locale, "shared.emptyBody")}</p>
        </article>
      ) : (
        <>
          <section className="dashboard-card admin-card">
            <form className="editor-form" method="get">
              <div className="form-grid">
              <label>
                <span>{t(locale, "shared.boat")}</span>
                <select defaultValue={workspace.selectedBoatId ?? ""} name="boat">
                  {workspace.boats.map((entry) => (
                    <option key={entry.boat.id} value={entry.boat.id}>
                      {entry.boat.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t(locale, "shared.season")}</span>
                <select defaultValue={workspace.selectedSeason?.id ?? ""} name="season">
                  {workspace.seasons.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-grid__wide">
                <span>{t(locale, "shared.owner")}</span>
                <input
                  defaultValue={selected?.ownerDisplayName ?? "—"}
                  disabled
                  readOnly
                />
              </label>
              </div>
              <div className="modal__footer">
                <button className="secondary-button" type="submit">
                  {t(locale, "shared.open")}
                </button>
              </div>
            </form>
          </section>

          <div className="shared-boat-grid">
            {workspace.boats.map((entry) => (
              <Link
                className={`boat-card ${entry.boat.id === workspace.selectedBoatId ? "is-active" : ""}`}
                href={`/shared?boat=${entry.boat.id}`}
                key={entry.boat.id}
              >
                <div className="boat-card__header">
                  <p className="eyebrow">{t(locale, "shared.boat")}</p>
                  <span className="status-pill is-good">{t(locale, "shared.open")}</span>
                </div>
                <h3>{entry.boat.name}</h3>
                <p className="muted">{entry.season?.name ?? t(locale, "planning.noSeasonSelected")}</p>
                <p className="meta">
                  {t(locale, "shared.owner")}: {entry.ownerDisplayName ?? "—"}
                </p>
              </Link>
            ))}
          </div>

          {selected && selected.season ? (
            <>
              <section className="workspace-grid workspace-grid--single">
                <Timeline
                  season={selected.season}
                  showAvailability={false}
                  showVisits={false}
                  subtitle=""
                  title={t(locale, "shared.title")}
                  tripSegments={selected.tripSegments}
                  visits={[]}
                />
              </section>
              <section className="workspace-grid workspace-grid--single">
                <MapPanel
                  tall
                  title={selected.boat.name}
                  tripSegments={selected.tripSegments}
                  visits={[]}
                />
              </section>
            </>
          ) : (
            <article className="dashboard-card">
              <p className="muted">{t(locale, "planning.noSeasonSelected")}</p>
            </article>
          )}
        </>
      )}
    </main>
  );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Shared timelines unavailable.";

    return (
      <main className="shell">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">{t(locale, "dashboard.sharedTimelines")}</p>
            <h1>{t(locale, "shared.title")}</h1>
          </div>
          <div className="workspace-header__actions">
            <Link className="secondary-button" href="/dashboard?change=1">
              {t(locale, "common.dashboard")}
            </Link>
            <LogoutButton />
          </div>
        </header>

        <article className="dashboard-card">
          <p className="eyebrow">{t(locale, "shared.enableTitle")}</p>
          <p className="muted">
            {message.includes("is_timeline_public")
              ? "Falta aplicar la migracion de timelines publicos en Supabase remoto."
              : message}
          </p>
        </article>
      </main>
    );
  }
}
