import { cookies } from "next/headers";
import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { SharedBoatPicker } from "@/components/shared/shared-boat-picker";
import { SharedTimelineCompare } from "@/components/shared/shared-timeline-compare";
import { TimelineVisibilityPanel } from "@/components/shared/timeline-visibility-panel";
import {
  getAccessibleBoatsLite,
  getBoatTimelineSnapshot,
  getSharedTimelineWorkspace,
} from "@/lib/boat-data";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function SharedPage({
  searchParams,
}: {
  searchParams: Promise<{ boat?: string; season?: string }>;
}) {
  const [locale, { boat, season }, availableBoats, cookieStore] = await Promise.all([
    getRequestLocale(),
    searchParams,
    getAccessibleBoatsLite(),
    cookies(),
  ]);
  try {
    const workspace = await getSharedTimelineWorkspace(boat, season);
    const selected = workspace.selectedBoat;
    const lastBoatId = cookieStore.get("lastBoatId")?.value ?? null;
    const ownBoatId =
      (lastBoatId && availableBoats.some((entry) => entry.boat_id === lastBoatId)
        ? lastBoatId
        : availableBoats[0]?.boat_id) ?? null;
    const ownWorkspace = ownBoatId ? await getBoatTimelineSnapshot(ownBoatId) : null;
    const isSameBoatAsOwn = Boolean(
      ownWorkspace?.boat.id && selected?.boat.id && ownWorkspace.boat.id === selected.boat.id,
    );
    return (
      <main className="shell">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">{t(locale, "shared.eyebrow")}</p>
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
            <SharedBoatPicker
              entries={workspace.boats.map((entry) => ({
                boatId: entry.boat.id,
                boatName: entry.boat.name,
                homePort: entry.boat.home_port ?? null,
                seasonId: entry.season?.id ?? null,
                seasonName: entry.season?.name ?? null,
                ownerDisplayName: entry.ownerDisplayName ?? null,
                isActive: entry.boat.id === workspace.selectedBoatId,
              }))}
              selectedBoatId={workspace.selectedBoatId}
            />

            {selected && selected.season ? (
              <SharedTimelineCompare
                ownEntry={
                  ownWorkspace?.boat && ownWorkspace.selectedSeason && !isSameBoatAsOwn
                    ? {
                        boat: ownWorkspace.boat,
                        season: ownWorkspace.selectedSeason,
                        tripSegments: ownWorkspace.tripSegments,
                        label: ownWorkspace.boat.name,
                      }
                    : null
                }
                selectedEntry={{
                  boat: selected.boat,
                  season: selected.season,
                  tripSegments: selected.tripSegments,
                  ownerDisplayName: selected.ownerDisplayName,
                  label: selected.boat.name,
                }}
              />
            ) : (
              <article className="dashboard-card">
                <p className="eyebrow">{selected?.boat.name ?? t(locale, "shared.selectionTitle")}</p>
                <p className="muted">{t(locale, "shared.noSeasonPublished")}</p>
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
            <p className="eyebrow">{t(locale, "shared.eyebrow")}</p>
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
