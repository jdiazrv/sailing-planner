import { cookies } from "next/headers";
import { Suspense } from "react";

import { AppSidebarNav } from "@/components/layout/app-sidebar-nav";
import { SidebarLoadingShell } from "@/components/layout/sidebar-loading-shell";
import { getAccessibleBoatsLite, requireViewer } from "@/lib/boat-data";
import { getRequestLocale } from "@/lib/i18n-server";

async function DashboardSidebar() {
  const [locale, { viewer }, boats, cookieStore] = await Promise.all([
    getRequestLocale(),
    requireViewer(),
    getAccessibleBoatsLite(),
    cookies(),
  ]);

  const lastBoatId = cookieStore.get("lastBoatId")?.value;
  const activeBoatId =
    (lastBoatId && boats.some((entry) => entry.boat_id === lastBoatId)
      ? lastBoatId
      : boats[0]?.boat_id) ?? undefined;
  const canManageUsers =
    viewer.isSuperuser ||
    boats.some((entry) => entry.can_manage_boat_users);
  const canShare =
    viewer.isSuperuser ||
    Boolean(
      boats.find((entry) => entry.boat_id === activeBoatId)?.can_edit ||
      boats.find((entry) => entry.boat_id === activeBoatId)?.can_manage_boat_users,
    );

  return (
    <AppSidebarNav
      boatId={activeBoatId}
      canManageUsers={canManageUsers}
      canShare={canShare}
      currentUserId={viewer.profile?.id ?? undefined}
      isSuperuser={viewer.isSuperuser}
      locale={locale}
      userName={viewer.profile?.display_name ?? viewer.profile?.email ?? null}
    />
  );
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Suspense fallback={<SidebarLoadingShell />}>
        <DashboardSidebar />
      </Suspense>
      <main className="shell">{children}</main>
    </>
  );
}
