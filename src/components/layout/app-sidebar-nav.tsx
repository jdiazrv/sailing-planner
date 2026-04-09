"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { AppLoading } from "@/components/ui/app-loading";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { t, type Locale } from "@/lib/i18n";
import { REPLAY_TOUR_EVENT } from "@/lib/onboarding";

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

const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
    <path d="M13 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8" />
  </svg>
);

const IconMenu = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
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
  onClick,
  tourId,
  target,
  rel,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick?: () => void;
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
      onClick={onClick}
      prefetch={false}
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

function ActionItem({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="app-sidebar__item"
      data-label={label}
      onClick={onClick}
      type="button"
    >
      <span className="app-sidebar__icon">{icon}</span>
      <span className="app-sidebar__label">{label}</span>
    </button>
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
  boatName,
  userName,
  currentUserId,
  canShare,
  settingsSlot,
}: AppSidebarNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingNavigationLabel, setPendingNavigationLabel] = useState<string | null>(null);
  const signOutLabel = t(locale, "common.signOut");
  const currentUserHref = currentUserId ? "/account" : null;
  const homeHref = boatId ? `/boats/${boatId}` : "/dashboard";
  const loadingTitle = t(locale, "common.loading");
  const menuLabel = t(locale, "appSidebar.menu");
  const mobileTitle = boatName ?? "Sailing Planner";
  const mobileSubtitle = userName ?? t(locale, "boatLayout.eyebrow");
  const replayGuideLabel = t(locale, "appSidebar.replayGuide");

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const beginNavigationFeedback = ({
    href,
    label,
    target,
  }: {
    href: string;
    label: string;
    target?: string;
  }) => {
    if (target === "_blank" || !href.startsWith("/") || pathname === href) {
      return;
    }

    setPendingNavigationLabel(label);
  };

  useEffect(() => {
    setMobileOpen(false);
    setPendingNavigationLabel(null);
  }, [pathname]);

  useEffect(() => {
    if (!pendingNavigationLabel) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPendingNavigationLabel(null);
    }, 12000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pendingNavigationLabel]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const closeTransientNavigationUi = () => {
      setMobileOpen(false);
      setPendingNavigationLabel(null);
    };

    window.addEventListener("pageshow", closeTransientNavigationUi);
    window.addEventListener("popstate", closeTransientNavigationUi);

    return () => {
      window.removeEventListener("pageshow", closeTransientNavigationUi);
      window.removeEventListener("popstate", closeTransientNavigationUi);
    };
  }, []);

  const renderMobileLink = ({
    href,
    label,
    icon,
    active = false,
    target,
    rel,
    tourId,
  }: {
    href: string;
    label: string;
    icon: ReactNode;
    active?: boolean;
    target?: string;
    rel?: string;
    tourId?: string;
  }) => (
    <Link
      className={`app-mobile-menu__link${active ? " is-active" : ""}`}
      data-tour={tourId}
      href={href}
      onClick={() => {
        beginNavigationFeedback({ href, label, target });
        setMobileOpen(false);
      }}
      prefetch={false}
      rel={rel}
      target={target}
    >
      <span className="app-mobile-menu__link-icon">{icon}</span>
      <span className="app-mobile-menu__link-copy">{label}</span>
    </Link>
  );

  const renderMobileAction = ({
    label,
    icon,
    onClick,
  }: {
    label: string;
    icon: ReactNode;
    onClick: () => void;
  }) => (
    <button className="app-mobile-menu__link" onClick={onClick} type="button">
      <span className="app-mobile-menu__link-icon">{icon}</span>
      <span className="app-mobile-menu__link-copy">{label}</span>
    </button>
  );

  const handleReplayGuide = () => {
    if (boatId && pathname !== homeHref) {
      setMobileOpen(false);
      setPendingNavigationLabel(replayGuideLabel);
      router.push(`${homeHref}?replayGuide=1`);
      return;
    }

    window.dispatchEvent(new Event(REPLAY_TOUR_EVENT));
    setMobileOpen(false);
    setPendingNavigationLabel(null);
  };

  return (
    <>
      <div className="app-mobile-chrome">
        <button
          aria-controls="app-mobile-menu"
          aria-expanded={mobileOpen}
          aria-label={t(locale, "appSidebar.openMenu")}
          className="app-mobile-chrome__menu-button"
          onClick={() => setMobileOpen(true)}
          type="button"
        >
          <IconMenu />
        </button>

        <Link
          className="app-mobile-chrome__brand"
          href={homeHref}
          onClick={() => beginNavigationFeedback({ href: homeHref, label: t(locale, "appSidebar.plan") })}
          prefetch={false}
        >
          <SidebarLogoMark />
          <span className="app-mobile-chrome__brand-copy">
            <span className="app-mobile-chrome__title">{mobileTitle}</span>
            <span className="app-mobile-chrome__subtitle">{mobileSubtitle}</span>
          </span>
        </Link>

        {currentUserHref ? (
          <Link
            aria-label={t(locale, "userSettings.title")}
            className={`app-mobile-chrome__account${isActive(currentUserHref) ? " is-active" : ""}`}
            data-tour="sidebar-user-settings"
            href={currentUserHref}
            onClick={() => beginNavigationFeedback({ href: currentUserHref, label: t(locale, "userSettings.title") })}
            prefetch={false}
          >
            <IconProfile />
          </Link>
        ) : (
          <button
            aria-controls="app-mobile-menu"
            aria-expanded={mobileOpen}
            aria-label={menuLabel}
            className="app-mobile-chrome__account"
            onClick={() => setMobileOpen(true)}
            type="button"
          >
            <IconMenu />
          </button>
        )}
      </div>

      <nav aria-label={menuLabel} className="app-mobile-tabbar">
        <Link
          className={`app-mobile-tabbar__item${pathname === homeHref ? " is-active" : ""}`}
          data-tour="sidebar-plan"
          href={homeHref}
          onClick={() => beginNavigationFeedback({ href: homeHref, label: t(locale, "appSidebar.plan") })}
          prefetch={false}
        >
          <span className="app-mobile-tabbar__icon"><IconRoute /></span>
          <span className="app-mobile-tabbar__label">{t(locale, "appSidebar.plan")}</span>
        </Link>

        {boatId ? (
          <Link
            className={`app-mobile-tabbar__item${isActive(`/boats/${boatId}/summary`) ? " is-active" : ""}`}
            data-tour="sidebar-summary"
            href={`/boats/${boatId}/summary`}
            onClick={() => beginNavigationFeedback({ href: `/boats/${boatId}/summary`, label: t(locale, "boatNav.summary") })}
            prefetch={false}
          >
            <span className="app-mobile-tabbar__icon"><IconChart /></span>
            <span className="app-mobile-tabbar__label">{t(locale, "boatNav.summary")}</span>
          </Link>
        ) : null}

        <Link
          className={`app-mobile-tabbar__item${isActive(canShare && boatId ? `/boats/${boatId}/share` : "/shared") ? " is-active" : ""}`}
          data-tour={canShare && boatId ? "sidebar-invite" : undefined}
          href={canShare && boatId ? `/boats/${boatId}/share` : "/shared"}
          onClick={() =>
            beginNavigationFeedback({
              href: canShare && boatId ? `/boats/${boatId}/share` : "/shared",
              label: canShare && boatId ? t(locale, "appSidebar.invite") : t(locale, "appSidebar.shared"),
            })
          }
          prefetch={false}
        >
          <span className="app-mobile-tabbar__icon">{canShare && boatId ? <IconLink /> : <IconCompare />}</span>
          <span className="app-mobile-tabbar__label">{canShare && boatId ? t(locale, "appSidebar.invite") : t(locale, "appSidebar.shared")}</span>
        </Link>

        <button
          aria-controls="app-mobile-menu"
          aria-expanded={mobileOpen}
          aria-label={menuLabel}
          className={`app-mobile-tabbar__item${mobileOpen ? " is-active" : ""}`}
          onClick={() => setMobileOpen(true)}
          type="button"
        >
          <span className="app-mobile-tabbar__icon"><IconMenu /></span>
          <span className="app-mobile-tabbar__label">{menuLabel}</span>
        </button>
      </nav>

      {mobileOpen ? (
        <button
          aria-label={t(locale, "appSidebar.closeMenu")}
          className="app-mobile-menu__backdrop"
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      ) : null}

      <section
        aria-modal="true"
        aria-label={menuLabel}
        className={`app-mobile-menu${mobileOpen ? " is-open" : ""}`}
        id="app-mobile-menu"
        role="dialog"
      >
        <div className="app-mobile-menu__header">
          <div className="app-mobile-menu__header-copy">
            <span className="app-mobile-menu__eyebrow">Sailing Planner</span>
            <strong>{mobileTitle}</strong>
            <span>{mobileSubtitle}</span>
          </div>
          <button
            aria-label={t(locale, "appSidebar.closeMenu")}
            className="app-mobile-menu__close"
            onClick={() => setMobileOpen(false)}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="app-mobile-menu__content">
          <div className="app-mobile-menu__section">
            <p className="app-mobile-menu__section-label">{boatId ? t(locale, "appSidebar.boatSection") : t(locale, "common.dashboard")}</p>
            {boatId
              ? (
                <>
                  {renderMobileLink({ href: `/boats/${boatId}`, label: t(locale, "appSidebar.plan"), icon: <IconRoute />, active: pathname === `/boats/${boatId}`, tourId: "sidebar-plan" })}
                  {renderMobileLink({ href: `/boats/${boatId}/summary`, label: t(locale, "boatNav.summary"), icon: <IconChart />, active: isActive(`/boats/${boatId}/summary`), tourId: "sidebar-summary" })}
                  {canShare
                    ? renderMobileLink({ href: `/boats/${boatId}/share`, label: t(locale, "appSidebar.invite"), icon: <IconLink />, active: isActive(`/boats/${boatId}/share`), tourId: "sidebar-invite" })
                    : null}
                  {settingsSlot ? <div className="app-mobile-menu__slot">{settingsSlot}</div> : null}
                </>
              )
              : renderMobileLink({ href: "/dashboard", label: t(locale, "common.dashboard"), icon: <IconGrid />, active: pathname === "/dashboard" })}
          </div>

          {(isSuperuser || canManageUsers) ? (
            <div className="app-mobile-menu__section">
              <p className="app-mobile-menu__section-label">Admin</p>
              {isSuperuser ? renderMobileLink({ href: "/admin/boats", label: t(locale, "common.boats"), icon: <IconBoat />, active: isActive("/admin/boats"), tourId: "sidebar-admin-boats" }) : null}
              {renderMobileLink({ href: "/admin/users", label: t(locale, "appSidebar.members"), icon: <IconUsers />, active: isActive("/admin/users"), tourId: "sidebar-users" })}
              {isSuperuser ? renderMobileLink({ href: "/admin/metrics", label: t(locale, "dashboard.systemMetrics"), icon: <IconChart />, active: isActive("/admin/metrics") }) : null}
            </div>
          ) : null}

          <div className="app-mobile-menu__section">
            <p className="app-mobile-menu__section-label">{menuLabel}</p>
            {renderMobileLink({ href: "/shared", label: t(locale, "appSidebar.shared"), icon: <IconCompare />, active: isActive("/shared"), tourId: "sidebar-shared" })}
            {boatId ? renderMobileAction({ label: replayGuideLabel, icon: <IconHelp />, onClick: handleReplayGuide }) : null}
            {renderMobileLink({ href: "/manual", label: t(locale, "appSidebar.manual"), icon: <IconHelp />, tourId: "sidebar-manual" })}
            {currentUserHref ? renderMobileLink({ href: currentUserHref, label: t(locale, "userSettings.title"), icon: <IconProfile />, active: isActive(currentUserHref), tourId: "sidebar-user-settings" }) : null}
          </div>

          <div className="app-mobile-menu__section">
            <p className="app-mobile-menu__section-label">{t(locale, "userSettings.appearanceEyebrow")}</p>
            <div className="app-mobile-menu__controls">
              <ThemeSwitcher />
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        <div className="app-mobile-menu__footer">
          <LogoutButton className="app-mobile-menu__logout">
            <span className="app-mobile-menu__link-icon">
              <IconLogout />
            </span>
            <span className="app-mobile-menu__link-copy">{signOutLabel}</span>
          </LogoutButton>
        </div>
      </section>

    <aside className={`app-sidebar${mobileOpen ? " is-mobile-open" : ""}`} id="app-sidebar">
      {/* Brand */}
      <Link
        className="app-sidebar__brand"
        href={homeHref}
        onClick={() => beginNavigationFeedback({ href: homeHref, label: t(locale, "appSidebar.plan") })}
        prefetch={false}
      >
        <SidebarLogoMark />
        <span className="app-sidebar__brand-copy">
          <span className="app-sidebar__brand-label">Sailing Planner</span>
          {userName ? (
            <span className="app-sidebar__user-name">{userName}</span>
          ) : null}
        </span>
        <button
          aria-label={t(locale, "appSidebar.closeMenu")}
          className="app-sidebar__close"
          onClick={(event) => {
            event.preventDefault();
            setMobileOpen(false);
          }}
          type="button"
        >
          ×
        </button>
      </Link>

      {/* Main nav */}
      <nav className="app-sidebar__nav">
        {!boatId ? (
          <NavItem
            href="/dashboard"
            label={t(locale, "common.dashboard")}
            icon={<IconGrid />}
            active={pathname === "/dashboard"}
          />
        ) : null}

        {/* Boat section */}
        {boatId && (
          <>
            <p className="app-sidebar__section-label">
              {t(locale, "appSidebar.boatSection")}
            </p>
            <NavItem
              href={`/boats/${boatId}`}
              label={t(locale, "appSidebar.plan")}
              icon={<IconRoute />}
              active={pathname === `/boats/${boatId}`}
              onClick={() => {
                beginNavigationFeedback({ href: `/boats/${boatId}`, label: t(locale, "appSidebar.plan") });
                setMobileOpen(false);
              }}
              tourId="sidebar-plan"
            />
            <NavItem
              href={`/boats/${boatId}/summary`}
              label={t(locale, "boatNav.summary")}
              icon={<IconChart />}
              active={isActive(`/boats/${boatId}/summary`)}
              onClick={() => {
                beginNavigationFeedback({ href: `/boats/${boatId}/summary`, label: t(locale, "boatNav.summary") });
                setMobileOpen(false);
              }}
              tourId="sidebar-summary"
            />
            {canShare && (
              <NavItem
                href={`/boats/${boatId}/share`}
                label={t(locale, "appSidebar.invite")}
                icon={<IconLink />}
                active={isActive(`/boats/${boatId}/share`)}
                onClick={() => {
                  beginNavigationFeedback({ href: `/boats/${boatId}/share`, label: t(locale, "appSidebar.invite") });
                  setMobileOpen(false);
                }}
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
                label={t(locale, "common.boats")}
                icon={<IconBoat />}
                active={isActive("/admin/boats")}
                onClick={() => {
                  beginNavigationFeedback({ href: "/admin/boats", label: t(locale, "common.boats") });
                  setMobileOpen(false);
                }}
                tourId="sidebar-admin-boats"
              />
            )}
            <NavItem
              href="/admin/users"
              label={t(locale, "appSidebar.members")}
              icon={<IconUsers />}
              active={isActive("/admin/users")}
              onClick={() => {
                beginNavigationFeedback({ href: "/admin/users", label: t(locale, "appSidebar.members") });
                setMobileOpen(false);
              }}
              tourId="sidebar-users"
            />
            {isSuperuser && (
              <NavItem
                href="/admin/metrics"
                label={t(locale, "dashboard.systemMetrics")}
                icon={<IconChart />}
                active={isActive("/admin/metrics")}
                onClick={() => {
                  beginNavigationFeedback({ href: "/admin/metrics", label: t(locale, "dashboard.systemMetrics") });
                  setMobileOpen(false);
                }}
              />
            )}
          </>
        )}

        {/* Shared and account shortcuts */}
        <NavItem
          href="/shared"
          label={t(locale, "appSidebar.shared")}
          icon={<IconCompare />}
          active={isActive("/shared")}
          onClick={() => {
            beginNavigationFeedback({ href: "/shared", label: t(locale, "appSidebar.shared") });
            setMobileOpen(false);
          }}
          tourId="sidebar-shared"
        />

        <NavItem
          href="/manual"
          label={t(locale, "appSidebar.manual")}
          icon={<IconHelp />}
          onClick={() => {
            beginNavigationFeedback({ href: "/manual", label: t(locale, "appSidebar.manual") });
            setMobileOpen(false);
          }}
          tourId="sidebar-manual"
        />

        {boatId ? (
          <ActionItem
            icon={<IconHelp />}
            label={replayGuideLabel}
            onClick={handleReplayGuide}
          />
        ) : null}

        {currentUserHref ? (
          <NavItem
            href={currentUserHref}
            label={t(locale, "userSettings.title")}
            icon={<IconProfile />}
            active={isActive(currentUserHref)}
            onClick={() => {
              beginNavigationFeedback({ href: currentUserHref, label: t(locale, "userSettings.title") });
              setMobileOpen(false);
            }}
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

      {pendingNavigationLabel ? (
        <div className="app-sidebar-nav__pending-overlay" role="status" aria-live="polite">
          <div className="app-sidebar-nav__pending-card">
            <AppLoading subtitle={pendingNavigationLabel} title={loadingTitle} />
          </div>
        </div>
      ) : null}
    </>
  );
}
