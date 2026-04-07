import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { BoatSelector } from "@/components/boats/boat-selector";
import { LastBoatTracker } from "@/components/boats/last-boat-tracker";
import { BoatSettingsDialog } from "@/components/boats/boat-settings-dialog";
import { AppSidebarNav } from "@/components/layout/app-sidebar-nav";
import { getBoatLayoutSnapshot } from "@/lib/boat-data";
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
  const snapshot = await getBoatLayoutSnapshot(boatId);
  const isSuperuser = snapshot.viewer.isSuperuser;
  const canEditBoat =
    isSuperuser ||
    Boolean(
      snapshot.permission?.can_edit ||
      snapshot.permission?.permission_level === "manager",
    );
  const canManageUsers =
    isSuperuser ||
    Boolean(
      snapshot.permission?.can_manage_boat_users ||
      snapshot.permission?.permission_level === "manager",
    );
  const canShare = canEditBoat || canManageUsers;

  const settingsIcon = (
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
      <line x1="4" y1="6" x2="20" y2="6" />
      <circle cx="9" cy="6" r="2" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <circle cx="15" cy="12" r="2" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="11" cy="18" r="2" />
    </svg>
  );

  const settingsSlot = canEditBoat ? (
    isSuperuser ? (
      <Link className="app-sidebar__item" data-tour="sidebar-admin-boats" href="/admin/boats">
        <span className="app-sidebar__icon">{settingsIcon}</span>
        <span className="app-sidebar__label">{locale === "es" ? "Configurar barco" : "Boat settings"}</span>
      </Link>
    ) : (
      <BoatSettingsDialog
        boatId={boatId}
        boat={snapshot.boat}
        onboardingStep={snapshot.viewer.onboardingStep}
        onRemoveImage={removeBoatProfileImage}
        onSave={saveBoatProfile}
        onUploadImage={uploadBoatProfileImage}
        triggerClassName="app-sidebar__item"
        triggerIcon={settingsIcon}
        triggerLabel={locale === "es" ? "Configurar barco" : "Boat settings"}
      />
    )
  ) : undefined;

  return (
    <>
      <AppSidebarNav
        boatId={boatId}
        boatName={snapshot.boat.name}
        canEditBoat={canEditBoat}
        canManageUsers={canManageUsers}
        canShare={canShare}
        isSuperuser={isSuperuser}
        locale={locale}
        settingsSlot={settingsSlot}
        currentUserId={snapshot.viewer.profile?.id ?? undefined}
        userName={snapshot.viewer.profile?.display_name ?? snapshot.viewer.profile?.email ?? null}
      />

      <main className="shell">
        <LastBoatTracker boatId={boatId} />
        <header className="workspace-header">
          <div className="workspace-header__title">
            <h1>{snapshot.boat.name}</h1>
            <p className="muted">
              {snapshot.boat.description ??
                t(locale, "boatLayout.defaultDescription")}
            </p>
          </div>
          <div className="workspace-header__actions">
            <span className="badge">
              {getPermissionLabelForLocale(
                locale,
                snapshot.permission?.permission_level,
                isSuperuser,
              )}
            </span>
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
            <Link className="secondary-button sidebar-hidden" href="/shared">
              {t(locale, "boatLayout.sharedTimelines")}
            </Link>
            <span className="sidebar-hidden">
              <LogoutButton />
            </span>
          </div>
        </header>

        {isSuperuser && snapshot.boats.length > 1 && (
          <BoatSelector activeBoatId={boatId} boats={snapshot.boats} />
        )}
        {children}
      </main>
    </>
  );
}
