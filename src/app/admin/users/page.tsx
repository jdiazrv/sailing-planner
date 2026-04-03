import { UsersAdmin } from "@/components/admin/users-admin";
import { getAdminBoats, getAdminUsers, requireUserAdminAccess } from "@/lib/boat-data";
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
  const [access, boats, users] = await Promise.all([
    requireUserAdminAccess(),
    getAdminBoats(),
    getAdminUsers(),
  ]);
  const canInviteUsers = Boolean(getEnv().SUPABASE_SERVICE_ROLE_KEY);

  return (
    <>
      <header className="workspace-header">
        <div>
          <p className="eyebrow">{t(locale, "admin.users.eyebrow")}</p>
          <h1>{t(locale, "admin.users.title")}</h1>
          <p className="muted">{t(locale, "admin.users.subtitle")}</p>
        </div>
      </header>

      <UsersAdmin
        boats={boats}
        canInviteUsers={canInviteUsers}
        isSuperuser={access.viewer.isSuperuser}
        viewerUserId={access.user.id}
        onDeletePermission={deleteUserBoatPermission}
        onDeleteUser={deleteUserAccount}
        onInviteUser={createUserAccount}
        onSendInvite={inviteUserAccount}
        onSavePermission={saveUserBoatPermission}
        onSaveProfile={saveUserProfile}
        onUpdatePassword={updateUserPassword}
        users={users}
      />
    </>
  );
}
