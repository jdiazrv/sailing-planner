import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { AdminNav } from "@/components/admin/admin-nav";
import { UsersAdmin } from "@/components/admin/users-admin";
import { getAdminBoats, getAdminUsers } from "@/lib/boat-data";
import { getEnv } from "@/lib/env";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

import {
  createUserAccount,
  deleteUserAccount,
  deleteUserBoatPermission,
  inviteUserAccount,
  saveUserBoatPermission,
  saveUserProfile,
  updateUserPassword,
} from "../actions";

export default async function AdminUsersPage() {
  const locale = await getRequestLocale();
  const [boats, users] = await Promise.all([getAdminBoats(), getAdminUsers()]);
  const canInviteUsers = Boolean(getEnv().SUPABASE_SERVICE_ROLE_KEY);

  return (
    <main className="shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">{t(locale, "admin.users.eyebrow")}</p>
          <h1>{t(locale, "admin.users.title")}</h1>
          <p className="muted">{t(locale, "admin.users.subtitle")}</p>
        </div>
        <div className="workspace-header__actions">
          <Link className="secondary-button" href="/dashboard?change=1">
            {t(locale, "common.dashboard")}
          </Link>
          <LogoutButton />
        </div>
      </header>

      <AdminNav active="users" />

      <UsersAdmin
        boats={boats}
        canInviteUsers={canInviteUsers}
        onDeletePermission={deleteUserBoatPermission}
        onDeleteUser={deleteUserAccount}
        onInviteUser={createUserAccount}
        onSendInvite={inviteUserAccount}
        onSavePermission={saveUserBoatPermission}
        onSaveProfile={saveUserProfile}
        onUpdatePassword={updateUserPassword}
        users={users}
      />
    </main>
  );
}
