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
  isSuperuser: boolean;
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

type UserEditorSection = "global" | "boat" | "security";

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

const tLabel = (
  locale: "es" | "en",
  key: "auth.email" | "admin.users.displayName",
) =>
  locale === "es"
    ? key === "auth.email"
      ? "Correo"
      : "Nombre visible"
    : key === "auth.email"
      ? "Email"
      : "Display name";

const formatLastAccess = (
  value: string | null | undefined,
  locale: "es" | "en",
) => {
  if (!value) {
    return locale === "es" ? "sin registros" : "no records";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
  isSuperuser,
}: UsersAdminProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "");
  const { locale, t } = useI18n();
  const sortedUsers = [...users].sort((a, b) =>
    `${a.display_name ?? ""}${a.email ?? ""}`.localeCompare(
      `${b.display_name ?? ""}${b.email ?? ""}`,
      locale,
    ),
  );
  const selectedUser =
    sortedUsers.find((user) => user.id === selectedUserId) ??
    users.find((user) => user.id === selectedUserId) ??
    sortedUsers[0] ??
    users[0];

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
        toast.success(t("admin.users.invitationSent"));
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

      {isSuperuser && (
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
                  <input name="display_name" placeholder={t("admin.users.displayNamePlaceholder")} />
                </label>
                <label>
                  <span>{t("auth.password")}</span>
                  <input
                    minLength={8}
                    name="password"
                    placeholder={t("admin.users.passwordPlaceholder")}
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
      )}

      <article className="dashboard-card admin-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">{t("admin.users.invitationEyebrow")}</p>
            <h2>{t("admin.users.invitationTitle")}</h2>
          </div>
        </div>
        {canInviteUsers ? (
          <InviteUserForm
            boats={boats}
            isPending={isPending}
            isSuperuser={isSuperuser}
            locale={locale}
            onSubmit={sendInvite}
          />
        ) : (
          <p className="muted">{t("admin.users.serviceRoleMissing")}</p>
        )}
      </article>

      <article className="dashboard-card admin-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">{t("admin.users.selectEyebrow")}</p>
            <h2>{t("admin.users.selectTitle")}</h2>
            <p className="muted">{t("admin.users.selectHelp")}</p>
          </div>
        </div>
        <SearchableSelect
          emptyText={t("admin.users.noUsersMatch")}
          label={t("admin.users.user")}
          onSelect={setSelectedUserId}
          options={sortedUsers.map((user) => ({
            id: user.id,
            primary: user.display_name ?? user.email ?? user.id,
            secondary: user.email ?? "—",
            tertiary:
              user.permissions[0]
                ? boats.find((boat) => boat.id === user.permissions[0]?.boat_id)?.name ?? "—"
                : t("admin.users.noAssignedBoat"),
          }))}
          placeholder={t("admin.users.searchUser")}
          selectedId={selectedUser?.id ?? ""}
        />
      </article>

      {selectedUser ? (
        <UserEditorCard
          boats={boats}
          isSuperuser={isSuperuser}
          key={selectedUser.id}
          onDeletePermission={onDeletePermission}
          onDeleteUser={onDeleteUser}
          onSavePermission={onSavePermission}
          onSaveProfile={onSaveProfile}
          onUpdatePassword={onUpdatePassword}
          user={selectedUser}
        />
      ) : null}
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
  isSuperuser: boolean;
  locale: "es" | "en";
  onSubmit: (fd: FormData) => void;
}) {
  const [permissions, setPermissions] = useState<InvitePermissionsState>(
    getPermissionPreset("viewer"),
  );
  const [selectedBoatId, setSelectedBoatId] = useState(boats[0]?.id ?? "");
  const sortedBoats = [...boats].sort((a, b) => a.name.localeCompare(b.name, locale));

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
        <input name="is_guest_user" type="hidden" value="on" />
        <input name="boat_id" type="hidden" value={selectedBoatId} />
        <label>
          <span>{tLabel(locale, "auth.email")}</span>
          <input name="email" placeholder="crew@example.com" required type="email" />
        </label>
        <label>
          <span>{tLabel(locale, "admin.users.displayName")}</span>
          <input
            name="display_name"
            placeholder={locale === "es" ? "Tripulación invitada" : "Invited crew"}
          />
        </label>
        <label>
          <span>{locale === "es" ? "Idioma" : "Language"}</span>
          <select defaultValue="es" name="preferred_language">
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </label>
        <div className="form-grid__wide">
          <SearchableSelect
            emptyText={locale === "es" ? "Ningún barco coincide con la búsqueda." : "No boats match the search."}
            label={text.boat}
            name="boat_id"
            onSelect={setSelectedBoatId}
            options={sortedBoats.map((boat) => ({
              id: boat.id,
              primary: boat.name,
              secondary: boat.home_port ?? "—",
              tertiary: boat.model ?? "",
            }))}
            placeholder={locale === "es" ? "Escribe para buscar un barco" : "Type to search a boat"}
            selectedId={selectedBoatId}
          />
        </div>
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
  isSuperuser,
  onSaveProfile,
  onSavePermission,
  onDeletePermission,
  onUpdatePassword,
  onDeleteUser,
}: {
  user: UserAdminProfile;
  boats: BoatDetails[];
  isSuperuser: boolean;
  onSaveProfile: (fd: FormData) => Promise<void>;
  onSavePermission: (fd: FormData) => Promise<void>;
  onDeletePermission: (fd: FormData) => Promise<void>;
  onUpdatePassword: (fd: FormData) => Promise<void>;
  onDeleteUser: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedBoatId, setSelectedBoatId] = useState(
    user.permissions[0]?.boat_id ?? boats[0]?.id ?? "",
  );
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const { locale, t } = useI18n();
  const assignedBoatIds = user.permissions.map((entry) => entry.boat_id);
  const sortedBoats = [...boats].sort((a, b) => a.name.localeCompare(b.name, locale));
  const selectedBoat =
    sortedBoats.find((boat) => boat.id === selectedBoatId) ??
    boats.find((boat) => boat.id === selectedBoatId) ??
    sortedBoats[0] ??
    boats[0];
  const accessSummary = isSuperuser
    ? locale === "es"
      ? `${user.sign_in_count} accesos · último acceso ${formatLastAccess(user.last_sign_in_at, locale)}`
      : `${user.sign_in_count} sign-ins · last access ${formatLastAccess(user.last_sign_in_at, locale)}`
    : null;
  const [activeSection, setActiveSection] = useState<UserEditorSection>("global");

  const sectionOptions: Array<{
    id: UserEditorSection;
    label: string;
  }> = [
    { id: "global", label: t("admin.users.sectionGlobal") },
    { id: "boat", label: t("admin.users.sectionBoat") },
    ...(isSuperuser
      ? ([{ id: "security", label: t("admin.users.sectionSecurity") }] as const)
      : []),
  ];

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
    const password = formData.get("password")?.toString() ?? "";
    const confirmPassword = formData.get("confirm_password")?.toString() ?? "";
    if (password !== confirmPassword) {
      setPasswordError(
        locale === "es" ? "Las contraseñas no coinciden." : "Passwords do not match.",
      );
      return;
    }
    setPasswordError(null);
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
          <h2>{user.display_name ?? user.email ?? t("admin.users.unnamedUser")}</h2>
          <p className="muted">{user.email ?? "—"}</p>
        </div>
        <span className={`status-pill ${user.is_superuser ? "is-good" : "is-muted"}`}>
          {user.is_superuser ? t("admin.users.superuser") : t("admin.users.standardUser")}
        </span>
      </div>

      <div className="editor-sections-nav" role="tablist" aria-label={t("admin.users.sectionNav")}>
        {sectionOptions.map((section) => (
          <button
            aria-selected={activeSection === section.id}
            className={`editor-sections-nav__item${activeSection === section.id ? " is-active" : ""}`}
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            role="tab"
            type="button"
          >
            {section.label}
          </button>
        ))}
      </div>

      {activeSection === "global" && (
        <article className="admin-card admin-card--section">
          <div className="card-header">
            <div>
              <p className="eyebrow">{t("admin.users.sectionGlobal")}</p>
              <p className="muted">{t("admin.users.sectionGlobalHelp")}</p>
            </div>
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
                  disabled={!isSuperuser}
                  name="is_superuser"
                  type="checkbox"
                />
                <span>{t("admin.users.globalSuperuser")}</span>
              </label>
              <label className="checkbox-field">
                <input
                  defaultChecked={user.is_timeline_public}
                  name="is_timeline_public"
                  type="checkbox"
                />
                <span>{t("admin.users.timelinePublic")}</span>
              </label>
            </div>

            <div className="modal__footer">
              <button className="primary-button" disabled={isPending} type="submit">
                {isPending ? t("admin.users.saving") : t("admin.users.saveProfile")}
              </button>
            </div>
          </form>
        </article>
      )}

      {activeSection === "security" && isSuperuser ? (
        <article className="admin-card admin-card--section">
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
                <p className="muted">{t("admin.users.sectionSecurityHelp")}</p>
                <p className="muted">{t("admin.users.passwordHelp")}</p>
                {accessSummary ? <p className="muted">{accessSummary}</p> : null}
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
              <label>
                <span>{t("auth.password")}</span>
                <input
                  minLength={8}
                  name="password"
                  placeholder={t("admin.users.passwordPlaceholder")}
                  required
                  type="password"
                />
              </label>
              <label>
                <span>{t("admin.users.confirmPassword")}</span>
                <input
                  minLength={8}
                  name="confirm_password"
                  placeholder={t("admin.users.passwordPlaceholder")}
                  required
                  type="password"
                />
              </label>
            </div>
            {passwordError ? <p className="feedback feedback--error">{passwordError}</p> : null}
            <div className="modal__footer">
              <button className="secondary-button" disabled={isPending} type="submit">
                {t("admin.users.changePassword")}
              </button>
            </div>
          </form>
        </article>
      ) : null}

      {activeSection === "boat" && (
        <article className="admin-card admin-card--section">
          <div className="card-header">
            <div>
              <p className="eyebrow">{t("admin.users.boatsSection")}</p>
              <p className="muted">{t("admin.users.sectionBoatHelp")}</p>
              {!user.is_superuser ? (
                <p className="muted">{t("admin.users.singleBoatOnly")}</p>
              ) : null}
            </div>
          </div>

          <div className="admin-card">
            <SearchableSelect
              emptyText={t("admin.users.noBoatMatches")}
              label={t("admin.users.selectBoat")}
              onSelect={setSelectedBoatId}
              options={sortedBoats.map((boat) => ({
                id: boat.id,
                primary: boat.name,
                secondary: boat.home_port ?? "—",
                tertiary: boat.model ?? "",
              }))}
              placeholder={t("admin.users.searchBoat")}
              selectedId={selectedBoat?.id ?? ""}
            />

            {assignedBoatIds.length > 0 ? (
              <div className="assigned-boats">
                <span className="muted">{t("admin.users.assignedBoats")}</span>
                <div className="assigned-boats__list">
                  {boats
                    .filter((boat) => assignedBoatIds.includes(boat.id))
                    .map((boat) => (
                      <span className="status-pill is-good" key={boat.id}>
                        {boat.name}
                      </span>
                    ))}
                </div>
              </div>
            ) : null}

            {selectedBoat ? (
              <div className="permission-list">
                <PermissionEditorRow
                  boat={selectedBoat}
                  disabled={isPending}
                  key={selectedBoat.id}
                  locale={locale}
                  onDelete={() => deletePermission(selectedBoat.id)}
                  onSave={savePermission}
                  permission={user.permissions.find((entry) => entry.boat_id === selectedBoat.id)}
                  userId={user.id}
                />
              </div>
            ) : null}
          </div>
        </article>
      )}
    </article>
  );
}

function SearchableSelect({
  label,
  placeholder,
  options,
  selectedId,
  onSelect,
  emptyText,
  name,
}: {
  label: string;
  placeholder: string;
  options: { id: string; primary: string; secondary?: string; tertiary?: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  emptyText: string;
  name?: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = options.filter((option) =>
    [option.primary, option.secondary, option.tertiary]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const selected = options.find((option) => option.id === selectedId) ?? filtered[0] ?? options[0];

  return (
    <div className="search-select">
      {name ? <input name={name} type="hidden" value={selected?.id ?? ""} /> : null}
      <label className="search-select__label">
        <span>{label}</span>
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder={selected && !query ? `${selected.primary} · ${selected.secondary ?? ""}` : placeholder}
          value={query}
        />
      </label>
      <div className="search-select__list">
        {filtered.length ? (
          filtered.map((option) => (
            <button
              className={`search-select__option${option.id === selectedId ? " is-active" : ""}`}
              key={option.id}
              onClick={() => {
                onSelect(option.id);
                setQuery("");
              }}
              type="button"
            >
              <strong>{option.primary}</strong>
              {option.secondary ? <span>{option.secondary}</span> : null}
              {option.tertiary ? <span>{option.tertiary}</span> : null}
            </button>
          ))
        ) : (
          <p className="muted">{emptyText}</p>
        )}
      </div>
    </div>
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
