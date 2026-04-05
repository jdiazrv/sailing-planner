"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import type { Locale } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Icons — 18×18, stroke-based, consistent 1.75 stroke-width
// ---------------------------------------------------------------------------

const IconGrid = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const IconRoute = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5" cy="12" r="2.5" />
    <circle cx="19" cy="12" r="2.5" />
    <path d="M7.5 12h9" />
    <path d="M5 6v3.5M19 6v3.5M5 18v-3.5M19 18v-3.5" />
  </svg>
);

const IconLink = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const IconCompare = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8H6M6 8l3-3M6 8l3 3" />
    <path d="M6 16h12M18 16l-3-3M18 16l-3 3" />
  </svg>
);

const IconBoat = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 3v12" />
    <path d="M11 4L6.5 13H11" />
    <path d="M11 6.5L17.2 13H11" />
    <path d="M4 15.5h14.5" />
    <path d="M6 18c2.1 1.3 4 1.8 6 1.8s3.9-.5 6-1.8" />
  </svg>
);

const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="3" />
    <path d="M3 21v-1a6 6 0 0 1 6-6h1" />
    <circle cx="17" cy="11" r="2.5" />
    <path d="M14 21v-.5a3.5 3.5 0 0 1 6 0V21" />
  </svg>
);

const IconChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20V12M9 20V8M14 20V4M19 20v-6" />
    <path d="M2 20h20" />
  </svg>
);

const IconProfile = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4 20a8 8 0 0 1 16 0" />
  </svg>
);

const IconHelp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2.2-3 4" />
    <circle cx="12" cy="17" r=".8" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const IconSwap = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 16V4m0 0L3 8m4-4 4 4" />
    <path d="M17 8v12m0 0 4-4m-4 4-4-4" />
  </svg>
);

const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
    <path d="M13 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8" />
  </svg>
);

// ---------------------------------------------------------------------------
// Logo mark (sailboat, matches brand.tsx geometry)
// ---------------------------------------------------------------------------

const SidebarLogoMark = () => (
  <svg
    aria-hidden="true"
    height="28"
    viewBox="0 0 80 80"
    width="28"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    <polygon fill="var(--accent)" points="38,16 38,64 10,64" />
    <polygon fill="var(--accent)" fillOpacity="0.28" points="42,30 42,64 70,64" />
    <line stroke="var(--accent)" strokeLinecap="round" strokeWidth="2" x1="40" x2="40" y1="10" y2="66" />
    <circle cx="40" cy="9" fill="var(--accent)" r="3.5" />
    <path d="M 9 65 Q 40 74 71 65" fill="none" stroke="var(--accent)" strokeLinecap="round" strokeOpacity="0.38" strokeWidth="1.5" />
  </svg>
);

// ---------------------------------------------------------------------------
// NavItem
// ---------------------------------------------------------------------------

function NavItem({
  href,
  label,
  icon,
  active,
  tourId,
  target,
  rel,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  tourId?: string;
  target?: string;
  rel?: string;
}) {
  return (
    <Link
      className={`app-sidebar__item${active ? " is-active" : ""}`}
      data-label={label}
      data-tour={tourId}
      href={href}
      rel={rel}
      target={target}
    >
      <span className="app-sidebar__icon">{icon}</span>
      <span className="app-sidebar__label">{label}</span>
    </Link>
  );
}

function BoatSettingsItem({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="app-sidebar__settings-slot" data-tour="sidebar-boat-settings">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export type AppSidebarNavProps = {
  locale: Locale;
  isSuperuser: boolean;
  canManageUsers: boolean;
  boatId?: string;
  boatName?: string;
  userName?: string | null;
  currentUserId?: string;
  canEditBoat?: boolean;
  canShare?: boolean;
  /** ReactNode slot for BoatSettingsDialog trigger — only on desktop sidebar */
  settingsSlot?: ReactNode;
};

export function AppSidebarNav({
  locale,
  isSuperuser,
  canManageUsers,
  boatId,
  userName,
  currentUserId,
  canShare,
  settingsSlot,
}: AppSidebarNavProps) {
  const pathname = usePathname();
  const es = locale === "es";
  const signOutLabel = es ? "Salir" : "Sign out";
  const currentUserHref = currentUserId
    ? `/admin/users?user=${encodeURIComponent(currentUserId)}&section=security`
    : null;

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <aside className="app-sidebar">
      {/* Brand */}
      <Link className="app-sidebar__brand" href="/dashboard">
        <SidebarLogoMark />
        <span className="app-sidebar__brand-copy">
          <span className="app-sidebar__brand-label">Sailing Planner</span>
          {userName ? (
            <span className="app-sidebar__user-name">{userName}</span>
          ) : null}
        </span>
      </Link>

      {/* Main nav */}
      <nav className="app-sidebar__nav">
        {!boatId ? (
          <NavItem
            href="/dashboard"
            label={es ? "Panel" : "Dashboard"}
            icon={<IconGrid />}
            active={pathname === "/dashboard"}
          />
        ) : null}

        {/* Boat section */}
        {boatId && (
          <>
            <p className="app-sidebar__section-label">
              {es ? "Barco" : "Boat"}
            </p>
            <NavItem
              href={`/boats/${boatId}`}
              label={es ? "Plan" : "Plan"}
              icon={<IconRoute />}
              active={pathname === `/boats/${boatId}`}
              tourId="sidebar-plan"
            />
            {canShare && (
              <NavItem
                href={`/boats/${boatId}/share`}
                label={es ? "Invitar" : "Invite"}
                icon={<IconLink />}
                active={isActive(`/boats/${boatId}/share`)}
                tourId="sidebar-invite"
              />
            )}
            {settingsSlot && (
              <BoatSettingsItem>
                {settingsSlot}
              </BoatSettingsItem>
            )}
          </>
        )}

        {/* Admin section */}
        {(isSuperuser || canManageUsers) && (
          <>
            <p className="app-sidebar__section-label">Admin</p>
            {isSuperuser && (
              <NavItem
                href="/admin/boats"
                label={es ? "Barcos" : "Boats"}
                icon={<IconBoat />}
                active={isActive("/admin/boats")}
              />
            )}
            <NavItem
              href="/admin/users"
              label={es ? "Miembros" : "Members"}
              icon={<IconUsers />}
              active={isActive("/admin/users")}
              tourId="sidebar-users"
            />
            {isSuperuser && (
              <NavItem
                href="/admin/metrics"
                label={es ? "Métricas" : "Metrics"}
                icon={<IconChart />}
                active={isActive("/admin/metrics")}
              />
            )}
          </>
        )}

        {/* Shared and account shortcuts */}
        <NavItem
          href="/shared"
          label={es ? "Compartidos" : "Shared"}
          icon={<IconCompare />}
          active={isActive("/shared")}
        />

        <NavItem
          href="/manual/ayuda-gestor.html"
          label={es ? "Manual" : "Manual"}
          icon={<IconHelp />}
          rel="noreferrer"
          target="_blank"
        />

        {/* Switch boat — superuser */}
        {isSuperuser && boatId && (
          <NavItem
            href="/dashboard?change=1"
            label={es ? "Cambiar" : "Switch"}
            icon={<IconSwap />}
          />
        )}

        {currentUserHref && (isSuperuser || canManageUsers) ? (
          <NavItem
            href={currentUserHref}
            label={es ? "Mi cuenta" : "My account"}
            icon={<IconProfile />}
            active={pathname === "/admin/users" && currentUserHref.includes("section=security")}
            tourId="sidebar-user-settings"
          />
        ) : null}
      </nav>

      {/* Footer utilities */}
      <div className="app-sidebar__footer">
        {/* Theme + Language */}
        <div className="app-sidebar__utils">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>

        {/* Logout */}
        <LogoutButton className="app-sidebar__item app-sidebar__logout-button">
          <span className="app-sidebar__icon">
            <IconLogout />
          </span>
          <span className="app-sidebar__label">{signOutLabel}</span>
        </LogoutButton>
      </div>
    </aside>
  );
}
