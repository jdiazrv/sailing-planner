import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { BoatSelector } from "@/components/boats/boat-selector";
import { getBoatWorkspace } from "@/lib/boat-data";
import { getPermissionLabel } from "@/lib/planning";

export default async function BoatLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ boatId: string }>;
}) {
  const { boatId } = await params;
  const workspace = await getBoatWorkspace(boatId);

  return (
    <main className="shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Boat workspace</p>
          <h1>{workspace.boat.name}</h1>
          <p className="muted">
            {workspace.boat.description ??
              "Season planning, trip routing, visits and availability."}
          </p>
        </div>
        <div className="workspace-header__actions">
          <span className="badge">
            Access:{" "}
            {getPermissionLabel(
              workspace.permission?.permission_level,
              workspace.viewer.isSuperuser,
            )}
          </span>
          <Link className="secondary-button" href="/dashboard">
            Change boat
          </Link>
          <LogoutButton />
        </div>
      </header>

      <BoatSelector activeBoatId={boatId} boats={workspace.boats} />
      {children}
    </main>
  );
}
