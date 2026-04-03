import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { BoatSelector } from "@/components/boats/boat-selector";
import { TimelineVisibilityPanel } from "@/components/shared/timeline-visibility-panel";
import { getAccessibleBoatsLite, requireViewer } from "@/lib/boat-data";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { getReleaseLabel } from "@/lib/release";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ change?: string }>;
}) {
  const [locale, { viewer }, boats, { change }] = await Promise.all([
    getRequestLocale(),
    requireViewer(),
    getAccessibleBoatsLite(),
    searchParams,
  ]);
  const releaseLabel = getReleaseLabel();

  // Single-boat users go directly to their boat
  if (boats.length === 1) {
    redirect(`/boats/${boats[0].boat_id}/trip`);
  }

  // Superuser with a remembered last boat → redirect unless they explicitly want to change
  if (viewer.isSuperuser && !change) {
    const cookieStore = await cookies();
    const lastBoatId = cookieStore.get("lastBoatId")?.value;
    if (lastBoatId && boats.some((b) => b.boat_id === lastBoatId)) {
      redirect(`/boats/${lastBoatId}/trip`);
    }
  }

  const activeBoats = boats.filter((b) => b.is_active !== false);

  return (
    <main className="shell">
      <header className="dashboard-header">
        <div>
          <h1>{viewer.isSuperuser ? t(locale, "dashboard.titleAll") : t(locale, "dashboard.titleOwn")}</h1>
          <p className="meta">{releaseLabel}</p>
          {viewer.isSuperuser && (
            <p className="muted">
              {boats.length} {t(locale, "dashboard.boatsCount")} ·{" "}
              {activeBoats.length} {t(locale, "dashboard.activeCount")}
            </p>
          )}
        </div>
        <div className="workspace-header__actions">
          {viewer.isSuperuser && (
            <>
              <Link className="secondary-button" href="/admin/boats">
                {t(locale, "dashboard.manageBoats")}
              </Link>
              <Link className="secondary-button" href="/admin/users">
                {t(locale, "dashboard.manageUsers")}
              </Link>
            </>
          )}
          <LogoutButton />
        </div>
      </header>

      {boats.length ? (
        <section>
          <BoatSelector boats={boats} />
        </section>
      ) : (
        <section className="dashboard-card" style={{ marginTop: "1.5rem" }}>
          <p className="eyebrow">{t(locale, "dashboard.noBoats")}</p>
          <p className="muted">{t(locale, "dashboard.noBoatsBody")}</p>
        </section>
      )}

      <section style={{ marginTop: "1rem" }}>
        <TimelineVisibilityPanel
          isPublic={Boolean(viewer.profile?.is_timeline_public)}
          isSuperuser={viewer.isSuperuser}
        />
      </section>

      {viewer.isSuperuser && boats.length > 0 && (
        <section className="dashboard-grid" style={{ marginTop: "1rem" }}>
          {boats.map((boat) => (
            <Link
              className="dashboard-card"
              href={`/boats/${boat.boat_id}/trip`}
              key={boat.boat_id}
              style={{ display: "block" }}
            >
              <p className="eyebrow">
                {boat.is_active ? t(locale, "common.active") : t(locale, "common.inactive")}
              </p>
              <h2>{boat.boat_name}</h2>
              <p className="muted">{t(locale, "boatSelector.selectBoat")}</p>
              {boat.home_port && (
                <p className="meta">{t(locale, "dashboard.homePort")}: {boat.home_port}</p>
              )}
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
