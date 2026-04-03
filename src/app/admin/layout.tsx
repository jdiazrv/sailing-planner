import { cookies } from "next/headers";

import { AppSidebarNav } from "@/components/layout/app-sidebar-nav";
import { requireUserAdminAccess } from "@/lib/boat-data";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, access, cookieStore] = await Promise.all([
    getRequestLocale(),
    requireUserAdminAccess(),
    cookies(),
  ]);
  const lastBoatId = cookieStore.get("lastBoatId")?.value ?? undefined;

  return (
    <>
      <AppSidebarNav
        isSuperuser={access.viewer.isSuperuser}
        canManageUsers={true}
        boatId={lastBoatId}
        canShare={true}
        currentUserId={access.viewer.profile?.id ?? access.user.id}
        locale={locale}
        userName={access.viewer.profile?.display_name ?? access.viewer.profile?.email ?? null}
      />
      <main className="shell">{children}</main>
    </>
  );
}
