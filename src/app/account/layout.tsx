import { cookies } from "next/headers";

import { AppSidebarNav } from "@/components/layout/app-sidebar-nav";
import { getAccessibleBoatsLite, requireViewer } from "@/lib/boat-data";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
  const hasManageUsersPermission = (boat: (typeof boats)[number] | undefined) =>
    Boolean(boat?.can_manage_boat_users || boat?.permission_level === "manager");
  const canManageUsers =
    viewer.isSuperuser ||
    boats.some((entry) => hasManageUsersPermission(entry));
  const canShare =
    viewer.isSuperuser ||
    Boolean(
      boats.find((entry) => entry.boat_id === activeBoatId)?.can_edit ||
      hasManageUsersPermission(boats.find((entry) => entry.boat_id === activeBoatId)),
    );

  return (
    <>
      <AppSidebarNav
        boatId={activeBoatId}
        canManageUsers={canManageUsers}
        canShare={canShare}
        currentUserId={viewer.profile?.id ?? undefined}
        isSuperuser={viewer.isSuperuser}
        locale={locale}
        userName={viewer.profile?.display_name ?? viewer.profile?.email ?? null}
      />
      <main className="shell">{children}</main>
    </>
  );
}