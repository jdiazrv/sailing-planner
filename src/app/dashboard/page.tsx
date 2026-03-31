import { LogoutButton } from "@/components/auth/logout-button";
import { BoatSelector } from "@/components/boats/boat-selector";
import { getAccessibleBoats, requireViewer } from "@/lib/boat-data";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { user, viewer } = await requireViewer();
  const boats = await getAccessibleBoats();

  if (boats.length === 1) {
    redirect(`/boats/${boats[0].boat_id}/trip`);
  }

  return (
    <main className="shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Boat selection</p>
          <h1>Choose your workspace</h1>
          <p className="muted">
            Signed in as{" "}
            {viewer.profile?.display_name ?? user.email ?? user.id}. Each boat keeps
            its own seasons, trip plan, visits and availability.
          </p>
        </div>
        <LogoutButton />
      </header>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <p className="eyebrow">Profile</p>
          <p>
            <span className="badge">
              {viewer.isSuperuser ? "Global superuser" : "Boat-scoped user"}
            </span>
          </p>
          <p className="meta">
            User id: <code>{user.id}</code>
          </p>
          <p className="meta">
            Email: <code>{user.email}</code>
          </p>
        </article>

        <article className="dashboard-card">
          <p className="eyebrow">What this V1 includes</p>
          <ul className="list">
            <li>Boat-specific trip planning with undefined periods and derived availability.</li>
            <li>Visit management with filters, warnings and synchronized timeline.</li>
            <li>Read-only versus editable workspace behavior driven by Supabase permissions.</li>
          </ul>
        </article>
      </section>

      {boats.length ? (
        <section className="dashboard-card">
          <p className="eyebrow">Accessible boats</p>
          <BoatSelector boats={boats} />
        </section>
      ) : (
        <section className="dashboard-card">
          <p className="eyebrow">No boats yet</p>
          <p className="muted">
            Your user still needs a `user_boat_permissions` assignment or a superuser
            needs to create the first boat.
          </p>
        </section>
      )}
    </main>
  );
}
