import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { BoatSelector } from "@/components/boats/boat-selector";
import { LastBoatTracker } from "@/components/boats/last-boat-tracker";
import { BoatSettingsDialog } from "@/components/boats/boat-settings-dialog";
import { AppSidebarNav } from "@/components/layout/app-sidebar-nav";
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
  const canShare = canEditBoat || canManageUsers;

  const settingsSlot = canEditBoat ? (
    <BoatSettingsDialog
      boat={workspace.boat}
      onRemoveImage={removeBoatProfileImage}
      onSave={saveBoatProfile}
      onUploadImage={uploadBoatProfileImage}
      triggerClassName="app-sidebar__item"
      triggerIcon={
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 3v12" />
          <path d="M11 4L6.5 13H11" />
          <path d="M11 6.5L17.2 13H11" />
          <path d="M4 15.5h14.5" />
          <path d="M6 18c2.1 1.3 4 1.8 6 1.8s3.9-.5 6-1.8" />
        </svg>
      }
      triggerLabel={t(locale, "boatLayout.boatSettings")}
    />
  ) : undefined;

  return (
    <>
      <AppSidebarNav
        boatId={boatId}
        boatName={workspace.boat.name}
        canEditBoat={canEditBoat}
        canManageUsers={canManageUsers}
        canShare={canShare}
        isSuperuser={isSuperuser}
        locale={locale}
        settingsSlot={settingsSlot}
        currentUserId={workspace.viewer.profile?.id ?? undefined}
        userName={workspace.viewer.profile?.display_name ?? workspace.viewer.profile?.email ?? null}
      />

      <main className="shell">
        <LastBoatTracker boatId={boatId} />

        <header className="workspace-header">
          <div className="workspace-header__title">
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
            {/* Mobile-only nav actions */}
            {isSuperuser && (
              <Link className="secondary-button sidebar-hidden" href="/admin/boats">
                {t(locale, "boatLayout.editBoats")}
              </Link>
            )}
            {canManageUsers && (
              <Link className="secondary-button sidebar-hidden" href="/admin/users">
                {t(locale, "boatLayout.editUsers")}
              </Link>
            )}
            {isSuperuser && (
              <Link className="secondary-button sidebar-hidden" href="/dashboard?change=1">
                {t(locale, "boatLayout.switchBoat")}
              </Link>
            )}
            <Link className="secondary-button sidebar-hidden" href="/shared">
              {t(locale, "boatLayout.sharedTimelines")}
            </Link>
            <span className="sidebar-hidden">
              <LogoutButton />
            </span>
          </div>
        </header>

        {isSuperuser && workspace.boats.length > 1 && (
          <BoatSelector activeBoatId={boatId} boats={workspace.boats} />
        )}

        {children}
      </main>
    </>
  );
}
