import { cookies } from "next/headers";

import { SharedBoatPicker } from "@/components/shared/shared-boat-picker";
import { SharedTimelineCompare } from "@/components/shared/shared-timeline-compare";
import { TimelineVisibilityPanel } from "@/components/shared/timeline-visibility-panel";
import {
  getAccessibleBoatsLite,
  getBoatTimelineSnapshot,
  getSharedTimelineWorkspace,
  SharedTimelineError,
  SharedTimelineErrorCode,
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
    const lastBoatId = cookieStore.get("lastBoatId")?.value ?? null;
    const ownBoatId =
      (lastBoatId && availableBoats.some((entry) => entry.boat_id === lastBoatId)
        ? lastBoatId
        : availableBoats[0]?.boat_id) ?? null;
    const [workspace, ownWorkspace] = await Promise.all([
      getSharedTimelineWorkspace(boat, season),
      ownBoatId ? getBoatTimelineSnapshot(ownBoatId) : Promise.resolve(null),
    ]);
    const requestedSelection = boat
      ? workspace.boats.find((entry) => entry.boat.id === boat) ?? null
      : null;
    const selected = requestedSelection;
    const isSameBoatAsOwn = Boolean(
      ownWorkspace?.boat.id && selected?.boat.id && ownWorkspace.boat.id === selected.boat.id,
    );
    const hasTimelineContent = Boolean(
      (ownWorkspace?.boat && ownWorkspace.selectedSeason) || selected,
    );
    return (
      <>
        <header className="workspace-header">
          <div>
            <p className="eyebrow">{t(locale, "shared.eyebrow")}</p>
            <h1>{t(locale, "shared.title")}</h1>
            <p className="muted">{t(locale, "shared.subtitle")}</p>
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
            {hasTimelineContent ? (
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
                pickerSlot={
                  <SharedBoatPicker
                    entries={workspace.boats.map((entry) => ({
                      boatId: entry.boat.id,
                      boatName: entry.boat.name,
                      homePort: entry.boat.home_port ?? null,
                      seasonId: entry.season?.id ?? null,
                      seasonName: entry.season?.name ?? null,
                      ownerDisplayName: entry.ownerDisplayName ?? null,
                      isActive: entry.boat.id === selected?.boat.id,
                    }))}
                    selectedBoatId={selected?.boat.id ?? null}
                  />
                }
                selectedEntry={
                  selected && selected.season
                    ? {
                        boat: selected.boat,
                        season: selected.season,
                        tripSegments: selected.tripSegments,
                        ownerDisplayName: selected.ownerDisplayName,
                        label: selected.boat.name,
                      }
                    : null
                }
              />
            ) : (
              <article className="dashboard-card">
                <p className="eyebrow">{t(locale, "shared.selectionTitle")}</p>
                <p className="muted">{t(locale, "shared.noSeasonPublished")}</p>
              </article>
            )}
          </>
        )}
      </>
    );
  } catch (error) {
    const message =
      error instanceof SharedTimelineError &&
      error.code === SharedTimelineErrorCode.PublicTimelineMigrationRequired
        ? error.message
        : error instanceof Error
          ? error.message
          : "Shared timelines unavailable.";

    return (
      <>
        <header className="workspace-header">
          <div>
            <p className="eyebrow">{t(locale, "shared.eyebrow")}</p>
            <h1>{t(locale, "shared.title")}</h1>
          </div>
        </header>

        <article className="dashboard-card">
          <p className="eyebrow">{t(locale, "shared.enableTitle")}</p>
          <p className="muted">{message}</p>
        </article>
      </>
    );
  }
}
