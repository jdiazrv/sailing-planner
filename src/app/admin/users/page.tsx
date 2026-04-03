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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; section?: string }>;
}) {
  const locale = await getRequestLocale();
  const [{ user, section }, access, boats, users] = await Promise.all([
    searchParams,
    requireUserAdminAccess(),
    getAdminBoats(),
    getAdminUsers(),
  ]);
  const canInviteUsers = Boolean(getEnv().SUPABASE_SERVICE_ROLE_KEY);
  const isOwnProfileMode = user === access.user.id;
  const visibleUsers = isOwnProfileMode
    ? users.filter((entry) => entry.id === access.user.id)
    : access.viewer.isSuperuser
      ? users
      : users.filter(
          (entry) => entry.id !== access.user.id && !entry.is_superuser,
        );

  return (
    <>
      <header className="workspace-header">
        <div>
          <p className="eyebrow">{t(locale, "admin.users.eyebrow")}</p>
          <h1>{isOwnProfileMode ? (locale === "es" ? "Mi cuenta" : "My account") : t(locale, "admin.users.title")}</h1>
          <p className="muted">
            {isOwnProfileMode
              ? (locale === "es"
                  ? "Actualiza tus datos personales y tu contraseña. Tus permisos se gestionan por separado."
                  : "Update your personal details and password. Your permissions are managed separately.")
              : access.viewer.isSuperuser
                ? t(locale, "admin.users.subtitle")
                : (locale === "es"
                    ? "Gestiona usuarios de tu propio barco: crear, invitar, actualizar datos y cambiar contraseñas."
                    : "Manage users for your own boat: create, invite, update details and change passwords.")}
          </p>
        </div>
      </header>

      <UsersAdmin
        boats={boats}
        canInviteUsers={canInviteUsers}
        isSuperuser={access.viewer.isSuperuser}
        initialSection={
          section === "global" || section === "boat" || section === "security"
            ? section
            : undefined
        }
        initialSelectedUserId={user}
        personalMode={isOwnProfileMode}
        singleBoatContext={!access.viewer.isSuperuser}
        viewerUserId={access.user.id}
        onDeletePermission={deleteUserBoatPermission}
        onDeleteUser={deleteUserAccount}
        onInviteUser={createUserAccount}
        onSendInvite={inviteUserAccount}
        onSavePermission={saveUserBoatPermission}
        onSaveProfile={saveUserProfile}
        onUpdatePassword={updateUserPassword}
        users={visibleUsers}
      />
    </>
  );
}
