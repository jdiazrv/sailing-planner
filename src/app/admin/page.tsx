import { redirect } from "next/navigation";

import { requireUserAdminAccess } from "@/lib/boat-data";

export default async function AdminIndexPage() {
  const access = await requireUserAdminAccess();
  redirect(access.viewer.isSuperuser ? "/admin/boats" : "/admin/users");
}
