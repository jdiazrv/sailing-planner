"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n/provider";
import type { BoatDetails, UserAdminProfile } from "@/lib/planning";
import type { PermissionLevel } from "@/types/database";

type UsersAdminProps = {
  boats: BoatDetails[];
  users: UserAdminProfile[];
  onSaveProfile: (fd: FormData) => Promise<void>;
  onSavePermission: (fd: FormData) => Promise<void>;
  onDeletePermission: (fd: FormData) => Promise<void>;
  onInviteUser: (fd: FormData) => Promise<void>;
  onSendInvite: (fd: FormData) => Promise<void>;
  onDeleteUser: (fd: FormData) => Promise<void>;
  onUpdatePassword: (fd: FormData) => Promise<void>;
  canInviteUsers: boolean;
};

type InvitePermissionsState = {
  permissionLevel: PermissionLevel;
  canEdit: boolean;
  canViewAllVisits: boolean;
  canViewVisitNames: boolean;
  canViewPrivateNotes: boolean;
  canViewOnlyOwnVisit: boolean;
  canManageBoatUsers: boolean;
  canViewAvailability: boolean;
};

const getPermissionPreset = (
  level: PermissionLevel,
): InvitePermissionsState => {
  switch (level) {
    case "manager":
      return {
        permissionLevel: "manager",
        canEdit: true,
        canViewAllVisits: true,
        canViewVisitNames: true,
        canViewPrivateNotes: true,
        canViewOnlyOwnVisit: false,
        canManageBoatUsers: true,
        canViewAvailability: true,
      };
    case "editor":
      return {
        permissionLevel: "editor",
        canEdit: true,
        canViewAllVisits: true,
        canViewVisitNames: true,
        canViewPrivateNotes: false,
        canViewOnlyOwnVisit: false,
        canManageBoatUsers: false,
        canViewAvailability: true,
      };
    default:
      return {
        permissionLevel: "viewer",
        canEdit: false,
        canViewAllVisits: false,
        canViewVisitNames: false,
        canViewPrivateNotes: false,
        canViewOnlyOwnVisit: false,
        canManageBoatUsers: false,
        canViewAvailability: true,
      };
  }
};

export function UsersAdmin({
  boats,
  users,
  onSaveProfile,
  onSavePermission,
  onDeletePermission,
  onInviteUser,
  onSendInvite,
  onDeleteUser,
  onUpdatePassword,
  canInviteUsers,
}: UsersAdminProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { locale, t } = useI18n();

  const inviteUser = (formData: FormData) => {
    startTransition(async () => {
      try {
        await onInviteUser(formData);
        toast.success(t("admin.users.userCreated"));
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("auth.error"));
      }
    });
  };

  const sendInvite = (formData: FormData) => {
    startTransition(async () => {
      try {
        await onSendInvite(formData);
        toast.success(locale === "es" ? "Invitación enviada" : "Invitation sent");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("auth.error"));
      }
    });
  };

  return (
    <section className="admin-stack">
      <article className="dashboard-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">{t("admin.users.summaryEyebrow")}</p>
            <h2>{t("admin.users.summaryTitle")}</h2>
          </div>
          <span className="badge">
            {users.length} {t("common.users").toLowerCase()}
          </span>
        </div>
        <p className="muted">{t("admin.users.summaryBody")}</p>
      </article>

      <article className="dashboard-card admin-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">{t("admin.users.newEyebrow")}</p>
            <h2>{t("admin.users.newTitle")}</h2>
          </div>
        </div>
        {canInviteUsers ? (
          <form
            className="editor-form"
            onSubmit={(event) => {
              event.preventDefault();
              inviteUser(new FormData(event.currentTarget));
              event.currentTarget.reset();
            }}
          >
            <div className="form-grid">
              <label>
                <span>{t("auth.email")}</span>
                <input name="email" placeholder="crew@example.com" required type="email" />
              </label>
              <label>
                <span>{t("admin.users.displayName")}</span>
                <input name="display_name" placeholder="Crew member" />
              </label>
              <label>
                <span>{t("auth.password")}</span>
                <input
                  minLength={8}
                  name="password"
                  placeholder="At least 8 characters"
                  required
                  type="password"
                />
              </label>
              <label>
                <span>{t("admin.users.language")}</span>
                <select defaultValue="es" name="preferred_language">
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </label>
            </div>
            <div className="modal__footer">
              <button className="primary-button" disabled={isPending} type="submit">
                {isPending ? t("admin.users.creatingUser") : t("admin.users.createUser")}
              </button>
            </div>
          </form>
        ) : (
          <p className="muted">{t("admin.users.serviceRoleMissing")}</p>
        )}
      </article>

      <article className="dashboard-card admin-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">{locale === "es" ? "Invitación" : "Invitation"}</p>
            <h2>{locale === "es" ? "Invitar usuario" : "Invite user"}</h2>
          </div>
        </div>
        {canInviteUsers ? (
          <InviteUserForm boats={boats} isPending={isPending} locale={locale} onSubmit={sendInvite} />
        ) : (
          <p className="muted">{t("admin.users.serviceRoleMissing")}</p>
        )}
      </article>

      {users.map((user) => (
        <UserEditorCard
          boats={boats}
          key={user.id}
          onDeletePermission={onDeletePermission}
          onDeleteUser={onDeleteUser}
          onSavePermission={onSavePermission}
          onSaveProfile={onSaveProfile}
          onUpdatePassword={onUpdatePassword}
          user={user}
        />
      ))}
    </section>
  );
}

function InviteUserForm({
  boats,
  isPending,
  locale,
  onSubmit,
}: {
  boats: BoatDetails[];
  isPending: boolean;
  locale: "es" | "en";
  onSubmit: (fd: FormData) => void;
}) {
  const [permissions, setPermissions] = useState<InvitePermissionsState>(
    getPermissionPreset("viewer"),
  );

  const text =
    locale === "es"
      ? {
          boat: "Barco",
          level: "Nivel de permiso",
          viewer: "Lector",
          editor: "Editor",
          manager: "Gestor",
          availability: "Ver disponibilidad",
          canEdit: "Puede editar",
          viewAllVisits: "Ver todas las visitas",
          viewNames: "Ver nombres de visitantes",
          privateNotes: "Ver notas privadas",
          ownVisits: "Solo sus visitas",
          manageUsers: "Gestionar usuarios del barco",
          send: "Enviar invitación",
          presetHint:
            "Al cambiar el nivel se aplican derechos recomendados, pero luego puedes retocarlos.",
        }
      : {
          boat: "Boat",
          level: "Permission level",
          viewer: "Viewer",
          editor: "Editor",
          manager: "Manager",
          availability: "View availability",
          canEdit: "Can edit",
          viewAllVisits: "View all visits",
          viewNames: "View visitor names",
          privateNotes: "View private notes",
          ownVisits: "Only own visits",
          manageUsers: "Manage boat users",
          send: "Send invitation",
          presetHint:
            "Changing the level applies recommended rights, and you can still tweak them after.",
        };

  return (
    <form
      className="editor-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(new FormData(event.currentTarget));
        event.currentTarget.reset();
        setPermissions(getPermissionPreset("viewer"));
      }}
    >
      <div className="form-grid">
        <label>
          <span>Email</span>
          <input name="email" placeholder="crew@example.com" required type="email" />
        </label>
        <label>
          <span>{locale === "es" ? "Nombre visible" : "Display name"}</span>
          <input name="display_name" placeholder="Crew member" />
        </label>
        <label>
          <span>{locale === "es" ? "Idioma" : "Language"}</span>
          <select defaultValue="es" name="preferred_language">
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </label>
        <label>
          <span>{text.boat}</span>
          <select defaultValue={boats[0]?.id ?? ""} name="boat_id" required>
            {boats.map((boat) => (
              <option key={boat.id} value={boat.id}>
                {boat.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{text.level}</span>
          <input name="permission_level" type="hidden" value={permissions.permissionLevel} />
          <div className="permission-presets">
            {([
              ["viewer", text.viewer],
              ["editor", text.editor],
              ["manager", text.manager],
            ] as const).map(([value, label]) => (
              <button
                className={`permission-preset${permissions.permissionLevel === value ? " is-active" : ""}`}
                key={value}
                onClick={() => setPermissions(getPermissionPreset(value))}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </label>
        <label className="form-grid__wide">
          <span>{text.presetHint}</span>
        </label>
        <label className="checkbox-field">
          <input
            checked={permissions.canViewAvailability}
            name="can_view_availability"
            onChange={(event) =>
              setPermissions((current) => ({
                ...current,
                canViewAvailability: event.target.checked,
              }))
            }
            type="checkbox"
          />
          <span>{text.availability}</span>
        </label>
        <label className="checkbox-field">
          <input
            checked={permissions.canEdit}
            name="can_edit"
            onChange={(event) =>
              setPermissions((current) => ({
                ...current,
                canEdit: event.target.checked,
              }))
            }
            type="checkbox"
          />
          <span>{text.canEdit}</span>
        </label>
        <label className="checkbox-field">
          <input
            checked={permissions.canViewAllVisits}
            name="can_view_all_visits"
            onChange={(event) =>
              setPermissions((current) => ({
                ...current,
                canViewAllVisits: event.target.checked,
                canViewOnlyOwnVisit: event.target.checked
                  ? false
                  : current.canViewOnlyOwnVisit,
              }))
            }
            type="checkbox"
          />
          <span>{text.viewAllVisits}</span>
        </label>
        <label className="checkbox-field">
          <input
            checked={permissions.canViewVisitNames}
            name="can_view_visit_names"
            onChange={(event) =>
              setPermissions((current) => ({
                ...current,
                canViewVisitNames: event.target.checked,
              }))
            }
            type="checkbox"
          />
          <span>{text.viewNames}</span>
        </label>
        <label className="checkbox-field">
          <input
            checked={permissions.canViewPrivateNotes}
            name="can_view_private_notes"
            onChange={(event) =>
              setPermissions((current) => ({
                ...current,
                canViewPrivateNotes: event.target.checked,
              }))
            }
            type="checkbox"
          />
          <span>{text.privateNotes}</span>
        </label>
        <label className="checkbox-field">
          <input
            checked={permissions.canViewOnlyOwnVisit}
            name="can_view_only_own_visit"
            onChange={(event) =>
              setPermissions((current) => ({
                ...current,
                canViewOnlyOwnVisit: event.target.checked,
                canViewAllVisits: event.target.checked
                  ? false
                  : current.canViewAllVisits,
              }))
            }
            type="checkbox"
          />
          <span>{text.ownVisits}</span>
        </label>
        <label className="checkbox-field">
          <input
            checked={permissions.canManageBoatUsers}
            name="can_manage_boat_users"
            onChange={(event) =>
              setPermissions((current) => ({
                ...current,
                canManageBoatUsers: event.target.checked,
              }))
            }
            type="checkbox"
          />
          <span>{text.manageUsers}</span>
        </label>
      </div>
      <div className="modal__footer">
        <button className="secondary-button" disabled={isPending} type="submit">
          {text.send}
        </button>
      </div>
    </form>
  );
}

function UserEditorCard({
  user,
  boats,
  onSaveProfile,
  onSavePermission,
  onDeletePermission,
  onUpdatePassword,
  onDeleteUser,
}: {
  user: UserAdminProfile;
  boats: BoatDetails[];
  onSaveProfile: (fd: FormData) => Promise<void>;
  onSavePermission: (fd: FormData) => Promise<void>;
  onDeletePermission: (fd: FormData) => Promise<void>;
  onUpdatePassword: (fd: FormData) => Promise<void>;
  onDeleteUser: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { locale, t } = useI18n();

  const saveProfile = (formData: FormData) => {
    startTransition(async () => {
      try {
        await onSaveProfile(formData);
        toast.success(t("admin.users.userUpdated"));
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("auth.error"));
      }
    });
  };

  const changePassword = (formData: FormData) => {
    startTransition(async () => {
      try {
        await onUpdatePassword(formData);
        toast.success(t("admin.users.passwordUpdated"));
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("auth.error"));
      }
    });
  };

  const savePermission = (formData: FormData) => {
    startTransition(async () => {
      try {
        await onSavePermission(formData);
        toast.success(t("admin.users.permissionSaved"));
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("auth.error"));
      }
    });
  };

  const deletePermission = (boatId: string) => {
    const formData = new FormData();
    formData.set("user_id", user.id);
    formData.set("boat_id", boatId);

    startTransition(async () => {
      try {
        await onDeletePermission(formData);
        toast.success(t("admin.users.permissionRemoved"));
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("auth.error"));
      }
    });
  };

  const deleteUser = () => {
    if (!confirm(t("admin.users.deleteUserConfirm"))) return;

    const formData = new FormData();
    formData.set("user_id", user.id);

    startTransition(async () => {
      try {
        await onDeleteUser(formData);
        toast.success(t("admin.users.userDeleted"));
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("auth.error"));
      }
    });
  };

  return (
    <article className="dashboard-card admin-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">{t("admin.users.userEyebrow")}</p>
          <h2>{user.display_name ?? user.email ?? "Unnamed user"}</h2>
        </div>
        <span className={`status-pill ${user.is_superuser ? "is-good" : "is-muted"}`}>
          {user.is_superuser ? t("admin.users.superuser") : t("admin.users.standardUser")}
        </span>
      </div>

      <form
        className="editor-form"
        onSubmit={(event) => {
          event.preventDefault();
          saveProfile(new FormData(event.currentTarget));
        }}
      >
        <input name="user_id" type="hidden" value={user.id} />
        <div className="form-grid">
          <label>
            <span>{t("admin.users.displayName")}</span>
            <input defaultValue={user.display_name ?? ""} name="display_name" />
          </label>
          <label>
            <span>{t("auth.email")}</span>
            <input defaultValue={user.email ?? ""} disabled readOnly />
          </label>
          <label>
            <span>{t("admin.users.language")}</span>
            <select
              defaultValue={user.preferred_language ?? "es"}
              name="preferred_language"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="checkbox-field">
            <input
              defaultChecked={user.is_superuser}
              name="is_superuser"
              type="checkbox"
            />
            <span>{t("admin.users.globalSuperuser")}</span>
          </label>
        </div>

        <div className="modal__footer">
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? t("admin.users.saving") : t("admin.users.saveProfile")}
          </button>
        </div>
      </form>

      <form
        className="editor-form"
        onSubmit={(event) => {
          event.preventDefault();
          changePassword(new FormData(event.currentTarget));
          event.currentTarget.reset();
        }}
      >
        <input name="user_id" type="hidden" value={user.id} />
        <div className="card-header">
          <div>
            <p className="eyebrow">{t("admin.users.passwordTitle")}</p>
            <p className="muted">{t("admin.users.passwordHelp")}</p>
          </div>
          <button
            className="link-button link-button--danger"
            disabled={isPending}
            onClick={deleteUser}
            type="button"
          >
            {isPending ? t("admin.users.deleting") : t("admin.users.deleteUser")}
          </button>
        </div>
        <div className="form-grid">
          <label className="form-grid__wide">
            <span>{t("auth.password")}</span>
            <input
              minLength={8}
              name="password"
              placeholder={t("admin.users.passwordPlaceholder")}
              required
              type="password"
            />
          </label>
        </div>
        <div className="modal__footer">
          <button className="secondary-button" disabled={isPending} type="submit">
            {t("admin.users.changePassword")}
          </button>
        </div>
      </form>

      <div className="card-header">
        <div>
          <p className="eyebrow">{t("admin.users.boatsSection")}</p>
        </div>
      </div>

      <div className="permission-list">
        {boats.map((boat) => {
          const permission = user.permissions.find((entry) => entry.boat_id === boat.id);

          return (
            <PermissionEditorRow
              boat={boat}
              disabled={isPending}
              key={boat.id}
              locale={locale}
              onDelete={() => deletePermission(boat.id)}
              onSave={savePermission}
              permission={permission}
              userId={user.id}
            />
          );
        })}
      </div>
    </article>
  );
}

function PermissionEditorRow({
  boat,
  permission,
  userId,
  disabled,
  onSave,
  onDelete,
  locale,
}: {
  boat: BoatDetails;
  permission:
    | UserAdminProfile["permissions"][number]
    | undefined;
  userId: string;
  disabled: boolean;
  onSave: (fd: FormData) => void;
  onDelete: () => void;
  locale: "es" | "en";
}) {
  const text =
    locale === "es"
      ? {
          existing: "Acceso existente",
          none: "Sin acceso todavía",
          viewer: "Lector",
          editor: "Editor",
          manager: "Gestor",
          canEdit: "Puede editar",
          viewAllVisits: "Ver todas las visitas",
          viewNames: "Ver nombres de visitantes",
          privateNotes: "Ver notas privadas",
          ownVisits: "Solo sus visitas",
          manageUsers: "Gestionar usuarios del barco",
          availability: "Ver disponibilidad",
          save: "Guardar acceso",
          grant: "Conceder acceso",
          remove: "Quitar acceso",
        }
      : {
          existing: "Existing access",
          none: "No access yet",
          viewer: "Viewer",
          editor: "Editor",
          manager: "Manager",
          canEdit: "Can edit",
          viewAllVisits: "View all visits",
          viewNames: "View visitor names",
          privateNotes: "View private notes",
          ownVisits: "Only own visits",
          manageUsers: "Manage boat users",
          availability: "View availability",
          save: "Save access",
          grant: "Grant access",
          remove: "Remove access",
        };

  return (
    <form
      className="permission-row"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(new FormData(event.currentTarget));
      }}
    >
      <input name="user_id" type="hidden" value={userId} />
      <input name="boat_id" type="hidden" value={boat.id} />

      <div className="permission-row__header">
        <div>
          <strong>{boat.name}</strong>
          <p className="muted">{permission ? text.existing : text.none}</p>
        </div>
        <select
          defaultValue={(permission?.permission_level ?? "viewer") as PermissionLevel}
          name="permission_level"
        >
          <option value="viewer">{text.viewer}</option>
          <option value="editor">{text.editor}</option>
          <option value="manager">{text.manager}</option>
        </select>
      </div>

      <div className="permission-grid">
        <label className="checkbox-field">
          <input defaultChecked={permission?.can_edit ?? false} name="can_edit" type="checkbox" />
          <span>{text.canEdit}</span>
        </label>
        <label className="checkbox-field">
          <input
            defaultChecked={permission?.can_view_all_visits ?? false}
            name="can_view_all_visits"
            type="checkbox"
          />
          <span>{text.viewAllVisits}</span>
        </label>
        <label className="checkbox-field">
          <input
            defaultChecked={permission?.can_view_visit_names ?? false}
            name="can_view_visit_names"
            type="checkbox"
          />
          <span>{text.viewNames}</span>
        </label>
        <label className="checkbox-field">
          <input
            defaultChecked={permission?.can_view_private_notes ?? false}
            name="can_view_private_notes"
            type="checkbox"
          />
          <span>{text.privateNotes}</span>
        </label>
        <label className="checkbox-field">
          <input
            defaultChecked={permission?.can_view_only_own_visit ?? false}
            name="can_view_only_own_visit"
            type="checkbox"
          />
          <span>{text.ownVisits}</span>
        </label>
        <label className="checkbox-field">
          <input
            defaultChecked={permission?.can_manage_boat_users ?? false}
            name="can_manage_boat_users"
            type="checkbox"
          />
          <span>{text.manageUsers}</span>
        </label>
        <label className="checkbox-field">
          <input
            defaultChecked={permission?.can_view_availability ?? false}
            name="can_view_availability"
            type="checkbox"
          />
          <span>{text.availability}</span>
        </label>
      </div>

      <div className="inline-actions">
        <button className="primary-button" disabled={disabled} type="submit">
          {permission ? text.save : text.grant}
        </button>
        {permission && (
          <button
            className="link-button link-button--danger"
            disabled={disabled}
            onClick={onDelete}
            type="button"
          >
            {text.remove}
          </button>
        )}
      </div>
    </form>
  );
}
