import Image from "next/image";
import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { BoatSelector } from "@/components/boats/boat-selector";
import { LastBoatTracker } from "@/components/boats/last-boat-tracker";
import { BoatSettingsDialog } from "@/components/boats/boat-settings-dialog";
import { getBoatWorkspace } from "@/lib/boat-data";
import { getPermissionLabelForLocale, t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import {
  removeBoatProfileImage,
  saveBoatProfile,
  uploadBoatProfileImage,
} from "./actions";

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
  const canEditBoat = isSuperuser || Boolean(workspace.permission?.can_edit);
  const canManageUsers =
    isSuperuser || Boolean(workspace.permission?.can_manage_boat_users);

  return (
    <main className="shell">
      <LastBoatTracker boatId={boatId} />
      <header className="workspace-header">
        <div className="workspace-header__title">
          <div className="workspace-header__eyebrow">
            <Image
              alt="Sailing Planner"
              className="app-logo"
              height={24}
              src="/sailing-planner-logo.svg"
              width={24}
            />
          </div>
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
          {canEditBoat ? (
            <BoatSettingsDialog
              boat={workspace.boat}
              onRemoveImage={removeBoatProfileImage}
              onSave={saveBoatProfile}
              onUploadImage={uploadBoatProfileImage}
            />
          ) : null}
          {isSuperuser && (
            <Link className="secondary-button" href="/admin/boats">
              {t(locale, "boatLayout.editBoats")}
            </Link>
          )}
          {canManageUsers && (
            <Link className="secondary-button" href="/admin/users">
              {t(locale, "boatLayout.editUsers")}
            </Link>
          )}
          {isSuperuser && (
            <Link className="secondary-button" href="/dashboard?change=1">
              {t(locale, "boatLayout.switchBoat")}
            </Link>
          )}
          <Link className="secondary-button" href="/shared">
            {t(locale, "boatLayout.sharedTimelines")}
          </Link>
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
