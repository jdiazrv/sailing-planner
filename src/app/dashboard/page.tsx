import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ProfileSummary = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "display_name" | "is_superuser"
>;

type BoatAccessSummary = Database["public"]["Views"]["boat_access_overview"]["Row"];

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profileData }, { data: boatsData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, is_superuser")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("boat_access_overview")
      .select("boat_id, boat_name, permission_level, can_edit, can_manage_boat_users")
      .order("boat_name"),
  ]);

  const profile = profileData as ProfileSummary | null;
  const boats = (boatsData ?? []) as BoatAccessSummary[];

  return (
    <main className="shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Authenticated area</p>
          <h1>Sailing Planner</h1>
          <p className="muted">
            Signed in as {profile?.display_name ?? user.email ?? user.id}.
          </p>
        </div>
        <LogoutButton />
      </header>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <p className="eyebrow">Profile</p>
          <p>
            <span className="badge">
              {profile?.is_superuser ? "Global superuser" : "Standard user"}
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
          <p className="eyebrow">Boat access</p>
          <ul className="list">
            {boats?.length ? (
              boats.map((boat) => (
                <li key={boat.boat_id}>
                  <strong>{boat.boat_name}</strong>
                  <p className="meta">
                    Level: {boat.permission_level ?? "superuser"}
                  </p>
                  <p className="meta">
                    Edit: {boat.can_edit ? "yes" : "no"} | Manage users:{" "}
                    {boat.can_manage_boat_users ? "yes" : "no"}
                  </p>
                </li>
              ))
            ) : (
              <li>
                No boat permissions yet. Use the bootstrap steps from the README
                to create the first boat and assignment.
              </li>
            )}
          </ul>
        </article>
      </section>
    </main>
  );
}
