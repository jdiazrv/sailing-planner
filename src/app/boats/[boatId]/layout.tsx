import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { BoatSelector } from "@/components/boats/boat-selector";
import { LastBoatTracker } from "@/components/boats/last-boat-tracker";
import { getBoatWorkspace } from "@/lib/boat-data";
import { getPermissionLabelForLocale, t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function BoatLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ boatId: string }>;
}) {
  const { boatId } = await params;
  const locale = await getRequestLocale();
  const workspace = await getBoatWorkspace(boatId);
  const isSuperuser = workspace.viewer.isSuperuser;

  return (
    <main className="shell">
      <LastBoatTracker boatId={boatId} />
      <header className="workspace-header">
        <div>
          <p className="eyebrow">{t(locale, "boatLayout.eyebrow")}</p>
          <h1>{workspace.boat.name}</h1>
          <p className="muted">
            {workspace.boat.description ??
              t(locale, "boatLayout.defaultDescription")}
          </p>
        </div>
        <div className="workspace-header__actions">
          <span className="badge">
            {getPermissionLabelForLocale(
              locale,
              workspace.permission?.permission_level,
              isSuperuser,
            )}
          </span>
          {isSuperuser && (
            <Link className="secondary-button" href="/admin/boats">
              {t(locale, "boatLayout.editBoats")}
            </Link>
          )}
          {isSuperuser && (
            <Link className="secondary-button" href="/admin/users">
              {t(locale, "boatLayout.editUsers")}
            </Link>
          )}
          {isSuperuser && (
            <Link className="secondary-button" href="/dashboard?change=1">
              {t(locale, "boatLayout.switchBoat")}
            </Link>
          )}
          <LogoutButton />
        </div>
      </header>

      {isSuperuser && (
        <BoatSelector activeBoatId={boatId} boats={workspace.boats} />
      )}

      {children}
    </main>
  );
}
