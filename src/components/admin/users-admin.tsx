"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n/provider";
import type { BoatDetails, UserAdminProfile } from "@/lib/planning";
import type { PermissionLevel, SignInMethod } from "@/types/database";

type UsersAdminProps = {
  boats: BoatDetails[];
  users: UserAdminProfile[];
  onSaveProfile: (fd: FormData) => Promise<void>;
  onSavePermission: (fd: FormData) => Promise<void>;
  onDeletePermission: (fd: FormData) => Promise<void>;
  onInviteUser: (fd: FormData) => Promise<void>;
  onSendInvite: (fd: FormData) => Promise<{ error: string | null }>;
  onDeleteUser: (fd: FormData) => Promise<void>;
  onUpdatePassword: (fd: FormData) => Promise<void>;
  canInviteUsers: boolean;
  isSuperuser: boolean;
  viewerUserId: string;
  viewerEmail: string;
  initialSelectedUserId?: string;
  initialSection?: UserEditorSection;
  personalMode?: boolean;
  singleBoatContext?: boolean;
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

type UserEditorSection = "global" | "boat" | "security" | "roles";
type UserSortCol = "name" | "boats" | "lastAccess" | "type";
type SortDir2 = "asc" | "desc";

const isNextRedirectSignal = (error: unknown) => {
  if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
    return true;
  }

  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return false;
  }

  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
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
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const formatAccessMethod = (
  value: SignInMethod | null | undefined,
  locale: "es" | "en",
) => {
  switch (value) {
    case "password":
      return locale === "es" ? "Contraseña" : "Password";
    case "magic_link":
      return "Magic link";
    case "google":
      return "Google";
    default:
      return locale === "es" ? "Sin registrar" : "Not recorded";
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
  isSuperuser,
  viewerUserId,
  initialSelectedUserId,
  initialSection,
  personalMode = false,
  singleBoatContext = false,
}: UsersAdminProps) {
  const [isPending, startTransition] = useTransition();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [createPermissions, setCreatePermissions] = useState<InvitePermissionsState>(
    getPermissionPreset("viewer"),
  );
  const [selectedUserId, setSelectedUserId] = useState(initialSelectedUserId ?? users[0]?.id ?? "");
  const [createSelectedBoatId, setCreateSelectedBoatId] = useState(boats[0]?.id ?? "");
  const [userSearch, setUserSearch] = useState("");
  const [userSortCol, setUserSortCol] = useState<UserSortCol>("name");
  const [userSortDir, setUserSortDir] = useState<SortDir2>("asc");
  const { locale, t } = useI18n();
  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) =>
        `${a.display_name ?? ""}${a.email ?? ""}`.localeCompare(
          `${b.display_name ?? ""}${b.email ?? ""}`,
          locale,
        ),
      ),
    [users, locale],
  );
  const selectedUser =
    sortedUsers.find((user) => user.id === selectedUserId) ??
    users.find((user) => user.id === selectedUserId) ??
    null;

  const sortedBoats = useMemo(
    () => [...boats].sort((a, b) => a.name.localeCompare(b.name, locale)),
    [boats, locale],
  );

  const handleUserSort = (col: UserSortCol) => {
    if (userSortCol === col) {
      setUserSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setUserSortCol(col);
      setUserSortDir("asc");
    }
  };

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    let list = q
      ? sortedUsers.filter((u) => {
          const boatNames = u.permissions
            .map((p) => boats.find((b) => b.id === p.boat_id)?.name ?? "")
            .join(" ");
          return [
            u.display_name ?? "",
            u.email ?? "",
            boatNames,
          ]
            .join(" ")
            .toLowerCase()
            .includes(q);
        })
      : sortedUsers;

    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (userSortCol) {
        case "name":
          cmp = `${a.display_name ?? a.email ?? ""}`.localeCompare(`${b.display_name ?? b.email ?? ""}`, locale);
          break;
        case "boats":
          cmp = a.permissions.length - b.permissions.length;
          break;
        case "lastAccess":
          cmp = (a.last_sign_in_at ?? "").localeCompare(b.last_sign_in_at ?? "");
          break;
        case "type":
          cmp = Number(b.is_superuser) - Number(a.is_superuser);
          break;
      }
      return userSortDir === "asc" ? cmp : -cmp;
    });
  }, [sortedUsers, userSearch, boats, userSortCol, userSortDir, locale]);
  const canAssignManagerRole = isSuperuser;

  useEffect(() => {
    if (!boats.length) {
      if (createSelectedBoatId) {
        setCreateSelectedBoatId("");
      }
      return;
    }

    if (!boats.some((boat) => boat.id === createSelectedBoatId)) {
      setCreateSelectedBoatId(boats[0]?.id ?? "");
    }
  }, [boats, createSelectedBoatId]);

  const showActionError = (error: unknown) => {
    if (isNextRedirectSignal(error)) {
      return;
    }

    toast.error(error instanceof Error ? error.message : t("auth.error"));
  };

  const inviteUser = (formData: FormData) => {
    startTransition(() => {
      void onInviteUser(formData)
        .then(() => {
          toast.success(t("admin.users.userCreated"));
        })
        .catch((error) => {
          showActionError(error);
        });
    });
  };

  const sendInvite = (formData: FormData) => {
    startTransition(() => {
      void onSendInvite(formData)
        .then((result) => {
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(t("admin.users.invitationSent"));
        })
        .catch((error) => {
          showActionError(error);
        });
    });
  };

  return (
    <section className="admin-stack">
      {!personalMode ? (
        <div
          className="dashboard-card admin-alta-strip"
          title={t("admin.users.accessBody")}
        >
          <p className="eyebrow">{t("admin.users.accessEyebrow")}</p>
          <div className="admin-alta-actions">
            <button
              className={`secondary-button secondary-button--small${showCreateForm ? " is-active-form" : ""}`}
              onClick={() => { setShowCreateForm((v) => !v); setShowInviteForm(false); }}
              type="button"
            >
              {locale === "es" ? "+ Crear usuario" : "+ Create user"}
            </button>
            {canInviteUsers ? (
              <button
                className={`secondary-button secondary-button--small${showInviteForm ? " is-active-form" : ""}`}
                onClick={() => { setShowInviteForm((v) => !v); setShowCreateForm(false); }}
                type="button"
              >
                {locale === "es" ? "Enviar invitación" : "Send invitation"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {!personalMode && showCreateForm ? (
        <article className="dashboard-card admin-card">
          <form
            className="editor-form"
            onSubmit={(event) => {
              event.preventDefault();
              inviteUser(new FormData(event.currentTarget));
              event.currentTarget.reset();
              setCreatePermissions(getPermissionPreset("viewer"));
              setShowCreateForm(false);
            }}
          >
            <div className="form-grid">
              {singleBoatContext && createSelectedBoatId ? (
                <input name="boat_id" type="hidden" value={createSelectedBoatId} />
              ) : null}
              <input
                name="permission_level"
                type="hidden"
                value={createPermissions.permissionLevel}
              />
              <input name="can_edit" type="hidden" value={createPermissions.canEdit ? "on" : ""} />
              <input
                name="can_view_all_visits"
                type="hidden"
                value={createPermissions.canViewAllVisits ? "on" : ""}
              />
              <input
                name="can_view_visit_names"
                type="hidden"
                value={createPermissions.canViewVisitNames ? "on" : ""}
              />
              <input
                name="can_view_private_notes"
                type="hidden"
                value={createPermissions.canViewPrivateNotes ? "on" : ""}
              />
              <input
                name="can_view_only_own_visit"
                type="hidden"
                value={createPermissions.canViewOnlyOwnVisit ? "on" : ""}
              />
              <input
                name="can_manage_boat_users"
                type="hidden"
                value={createPermissions.canManageBoatUsers ? "on" : ""}
              />
              <input
                name="can_view_availability"
                type="hidden"
                value={createPermissions.canViewAvailability ? "on" : ""}
              />
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
              {singleBoatContext && sortedBoats.length > 0 ? (
                <label className="form-grid__wide">
                  <span>{locale === "es" ? "Barco asignado" : "Assigned boat"}</span>
                  <input
                    disabled
                    readOnly
                    value={sortedBoats.find((boat) => boat.id === createSelectedBoatId)?.name ?? ""}
                  />
                </label>
              ) : null}
              <label>
                <span>{locale === "es" ? "Perfil" : "Role"}</span>
                <div className="permission-presets">
                  {([
                    ["viewer", locale === "es" ? "Lector" : "Viewer"],
                    ["editor", locale === "es" ? "Editor" : "Editor"],
                    ...(isSuperuser
                      ? ([
                          ["manager", locale === "es" ? "Gestor" : "Manager"],
                        ] as const)
                      : []),
                  ] as const).map(([value, label]) => (
                    <button
                      className={`permission-preset${createPermissions.permissionLevel === value ? " is-active" : ""}`}
                      key={value}
                      onClick={() => setCreatePermissions(getPermissionPreset(value))}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </label>
              {createPermissions.permissionLevel === "viewer" ? (
                <label className="checkbox-field">
                  <input
                    checked={createPermissions.canViewAllVisits}
                    onChange={(event) =>
                      setCreatePermissions((current) => ({
                        ...current,
                        canViewAllVisits: event.target.checked,
                        canViewVisitNames: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <span>
                    {locale === "es"
                      ? "El lector puede ver visitas"
                      : "Viewer can see visits"}
                  </span>
                </label>
              ) : null}
            </div>
            <div className="modal__footer">
              <button className="primary-button" disabled={isPending} type="submit">
                {isPending ? t("admin.users.creatingUser") : t("admin.users.createUser")}
              </button>
            </div>
          </form>
        </article>
      ) : null}

      {!personalMode && showInviteForm && canInviteUsers ? (
        <article className="dashboard-card admin-card">
          <InviteUserForm
            allowManagerRole={canAssignManagerRole}
            boats={boats}
            isPending={isPending}
            locale={locale}
            singleBoatContext={singleBoatContext}
            viewerEmail={viewerEmail}
            onSubmit={(fd) => { sendInvite(fd); setShowInviteForm(false); }}
          />
        </article>
      ) : null}

      {!personalMode ? (
        <article className="dashboard-card admin-card">
          <label className="admin-users-search">
            <span className="eyebrow">{locale === "es" ? "Buscar usuarios" : "Search users"}</span>
            <input
              onChange={(e) => { setUserSearch(e.target.value); setSelectedUserId(""); }}
              placeholder={locale === "es" ? "Nombre, correo o barco…" : "Name, email or boat…"}
              value={userSearch}
            />
          </label>

          {filteredUsers.length ? (
            <div className="metrics-table-wrap admin-users-table-wrap">
              <table className="metrics-table admin-users-table">
                <thead>
                  <tr>
                    <th
                      className={`sortable-th${userSortCol === "name" ? " is-sorted" : ""}`}
                      onClick={() => handleUserSort("name")}
                    >
                      {locale === "es" ? "Usuario" : "User"}
                      <span className="sort-icon">{userSortCol === "name" ? (userSortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                    </th>
                    <th
                      className={`sortable-th${userSortCol === "boats" ? " is-sorted" : ""}`}
                      onClick={() => handleUserSort("boats")}
                      title={locale === "es" ? "Ordena ascendente para ver usuarios sin barco primero" : "Sort ascending to see users without a boat first"}
                    >
                      {locale === "es" ? "Barcos" : "Boats"}
                      <span className="sort-icon">{userSortCol === "boats" ? (userSortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                    </th>
                    <th
                      className={`sortable-th${userSortCol === "lastAccess" ? " is-sorted" : ""}`}
                      onClick={() => handleUserSort("lastAccess")}
                    >
                      {locale === "es" ? "Último acceso" : "Last access"}
                      <span className="sort-icon">{userSortCol === "lastAccess" ? (userSortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                    </th>
                    <th
                      className={`sortable-th${userSortCol === "type" ? " is-sorted" : ""}`}
                      onClick={() => handleUserSort("type")}
                    >
                      {locale === "es" ? "Tipo" : "Type"}
                      <span className="sort-icon">{userSortCol === "type" ? (userSortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const isSelected = selectedUserId === user.id;
                    const assignedBoatNames = user.permissions
                      .slice(0, 2)
                      .map((p) => boats.find((b) => b.id === p.boat_id)?.name ?? "—");
                    const extraCount = user.permissions.length - assignedBoatNames.length;
                    return (
                      <tr
                        className={`admin-users-table__row${isSelected ? " is-selected" : ""}`}
                        key={user.id}
                        onClick={() => setSelectedUserId(isSelected ? "" : user.id)}
                      >
                        <td>
                          <strong>{user.display_name ?? user.email ?? "—"}</strong>
                          <div className="meta">{user.email ?? "—"}</div>
                        </td>
                        <td>
                          {assignedBoatNames.length > 0 ? (
                            <span>
                              {assignedBoatNames.join(", ")}
                              {extraCount > 0 ? ` +${extraCount}` : ""}
                            </span>
                          ) : (
                            <span className="meta">—</span>
                          )}
                        </td>
                        <td className="meta">
                          {formatLastAccess(user.last_sign_in_at, locale)}
                        </td>
                        <td>
                          <span className={`status-pill ${user.is_superuser ? "is-good" : "is-muted"}`}>
                            {user.is_superuser ? t("admin.users.superuser") : t("admin.users.standardUser")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">
              {locale === "es" ? "Ningún usuario coincide con la búsqueda." : "No users match the search."}
            </p>
          )}
        </article>
      ) : null}

      {selectedUser ? (
        <UserEditorCard
          boats={boats}
          initialSection={initialSection}
          isSuperuser={isSuperuser}
          key={selectedUser.id}
          onDeletePermission={onDeletePermission}
          onDeleteUser={onDeleteUser}
          onSavePermission={onSavePermission}
          onSaveProfile={onSaveProfile}
          onUpdatePassword={onUpdatePassword}
          allowManagerRole={canAssignManagerRole}
          personalMode={personalMode}
          singleBoatContext={singleBoatContext}
          user={selectedUser}
          viewerUserId={viewerUserId}
        />
      ) : null}
    </section>
  );
}

function InviteUserForm({
  allowManagerRole,
  boats,
  isPending,
  locale,
  singleBoatContext,
  viewerEmail,
  onSubmit,
}: {
  allowManagerRole: boolean;
  boats: BoatDetails[];
  isPending: boolean;
  locale: "es" | "en";
  singleBoatContext: boolean;
  viewerEmail: string;
  onSubmit: (fd: FormData) => void;
}) {
  const [permissions, setPermissions] = useState<InvitePermissionsState>(
    getPermissionPreset("viewer"),
  );
  const [selectedBoatId, setSelectedBoatId] = useState(boats[0]?.id ?? "");
  const sortedBoats = [...boats].sort((a, b) => a.name.localeCompare(b.name, locale));

  useEffect(() => {
    if (!sortedBoats.length) {
      if (selectedBoatId) {
        setSelectedBoatId("");
      }
      return;
    }

    if (!sortedBoats.some((boat) => boat.id === selectedBoatId)) {
      setSelectedBoatId(sortedBoats[0]?.id ?? "");
    }
  }, [selectedBoatId, sortedBoats]);

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
          viewerHelp: "Solo puede consultar el plan y la informacion permitida.",
          editorHelp: "Puede editar el plan, pero no gestionar usuarios.",
          managerHelp:
            "Puede editar, gestionar usuarios y seguir siendo el unico gestor del barco.",
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
          viewerHelp: "Can only review the plan and allowed information.",
          editorHelp: "Can edit the plan, but cannot manage users.",
          managerHelp:
            "Can edit, manage users, and remain the only manager for the boat.",
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
          <span>{locale === "es" ? "Invitación de" : "Invitation from"}</span>
          <input readOnly type="email" value={viewerEmail} />
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
        {singleBoatContext ? (
          <label>
            <span>{text.boat}</span>
            <input
              disabled
              readOnly
              value={sortedBoats.find((boat) => boat.id === selectedBoatId)?.name ?? ""}
            />
          </label>
        ) : (
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
        )}
        <label>
          <span>{text.level}</span>
          <input name="permission_level" type="hidden" value={permissions.permissionLevel} />
          <div className="permission-presets">
            {([
              ["viewer", text.viewer, text.viewerHelp],
              ["editor", text.editor, text.editorHelp],
              ...(allowManagerRole
                ? ([["manager", text.manager, text.managerHelp]] as const)
                : []),
            ] as const).map(([value, label]) => (
              <button
                className={`permission-preset${permissions.permissionLevel === value ? " is-active" : ""}`}
                key={value}
                onClick={() => setPermissions(getPermissionPreset(value))}
                title={
                  value === "viewer"
                    ? text.viewerHelp
                    : value === "editor"
                      ? text.editorHelp
                      : text.managerHelp
                }
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
            disabled={permissions.permissionLevel === "viewer"}
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
        {allowManagerRole ? (
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
        ) : null}
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
  viewerUserId,
  initialSection,
  allowManagerRole,
  personalMode,
  singleBoatContext,
}: {
  user: UserAdminProfile;
  boats: BoatDetails[];
  isSuperuser: boolean;
  onSaveProfile: (fd: FormData) => Promise<void>;
  onSavePermission: (fd: FormData) => Promise<void>;
  onDeletePermission: (fd: FormData) => Promise<void>;
  onUpdatePassword: (fd: FormData) => Promise<void>;
  onDeleteUser: (fd: FormData) => Promise<void>;
  viewerUserId: string;
  initialSection?: UserEditorSection;
  allowManagerRole: boolean;
  personalMode: boolean;
  singleBoatContext: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedBoatId, setSelectedBoatId] = useState(
    user.permissions[0]?.boat_id ?? boats[0]?.id ?? "",
  );
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const { locale, t } = useI18n();
  const assignedBoatIds = user.permissions.map((entry) => entry.boat_id);
  const sortedBoats = [...boats].sort((a, b) => a.name.localeCompare(b.name, locale));
  const assignedBoats = sortedBoats.filter((boat) => assignedBoatIds.includes(boat.id));
  const selectedBoat =
    sortedBoats.find((boat) => boat.id === selectedBoatId) ??
    boats.find((boat) => boat.id === selectedBoatId) ??
    sortedBoats[0] ??
    boats[0];
  const assignedBoatsSummary =
    locale === "es"
      ? `${assignedBoats.length} ${assignedBoats.length === 1 ? "barco asignado" : "barcos asignados"}`
      : `${assignedBoats.length} ${assignedBoats.length === 1 ? "assigned boat" : "assigned boats"}`;
  const canManageSecurity = isSuperuser || user.id === viewerUserId;
  const canEditPermissions = !personalMode;
  const accessSummary = canManageSecurity
    ? locale === "es"
      ? `${user.sign_in_count} accesos · último acceso ${formatLastAccess(user.last_sign_in_at, locale)}`
      : `${user.sign_in_count} sign-ins · last access ${formatLastAccess(user.last_sign_in_at, locale)}`
    : null;
  const [activeSection, setActiveSection] = useState<UserEditorSection>(
    initialSection ?? "global",
  );

  const sectionOptions: Array<{
    id: UserEditorSection;
    label: string;
  }> = [
    { id: "global", label: t("admin.users.sectionGlobal") },
    ...(canEditPermissions ? [{ id: "boat" as const, label: t("admin.users.sectionBoat") }] : []),
    ...(canManageSecurity
      ? ([{ id: "security", label: t("admin.users.sectionSecurity") }] as const)
      : []),
    ...(canEditPermissions
      ? [{ id: "roles" as const, label: locale === "es" ? "Roles" : "Roles" }]
      : []),
  ];
  const metricCards = [
    { label: t("admin.users.accessCount"), value: String(user.sign_in_count ?? 0) },
    { label: t("admin.users.lastAccess"), value: formatLastAccess(user.last_sign_in_at, locale) },
    {
      label: t("admin.users.lastAccessMethod"),
      value: formatAccessMethod(user.last_sign_in_method, locale),
    },
    { label: t("admin.users.boatsCount"), value: String(user.boats_count ?? 0) },
    { label: t("admin.users.seasonsCount"), value: String(user.seasons_count ?? 0) },
    {
      label: t("admin.users.invitesGeneratedCount"),
      value: String(user.invites_generated_count ?? 0),
    },
    { label: t("admin.users.tripsCount"), value: String(user.trip_segments_count ?? 0) },
    { label: t("admin.users.visitsCount"), value: String(user.visits_count ?? 0) },
  ];
  const showActionError = (error: unknown) => {
    if (isNextRedirectSignal(error)) {
      return;
    }

    toast.error(error instanceof Error ? error.message : t("auth.error"));
  };

  const saveProfile = (formData: FormData) => {
    startTransition(() => {
      void onSaveProfile(formData)
        .then(() => {
          toast.success(t("admin.users.userUpdated"));
        })
        .catch((error) => {
          showActionError(error);
        });
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
    startTransition(() => {
      void onUpdatePassword(formData)
        .then(() => {
          toast.success(t("admin.users.passwordUpdated"));
        })
        .catch((error) => {
          showActionError(error);
        });
    });
  };

  const savePermission = (formData: FormData) => {
    startTransition(() => {
      void onSavePermission(formData)
        .then(() => {
          toast.success(t("admin.users.permissionSaved"));
        })
        .catch((error) => {
          showActionError(error);
        });
    });
  };

  const deletePermission = (boatId: string) => {
    const formData = new FormData();
    formData.set("user_id", user.id);
    formData.set("boat_id", boatId);

    startTransition(() => {
      void onDeletePermission(formData)
        .then(() => {
          toast.success(t("admin.users.permissionRemoved"));
        })
        .catch((error) => {
          showActionError(error);
        });
    });
  };

  const deleteUser = () => {
    if (!confirm(t("admin.users.deleteUserConfirm"))) return;

    const formData = new FormData();
    formData.set("user_id", user.id);

    startTransition(() => {
      void onDeleteUser(formData)
        .then(() => {
          toast.success(t("admin.users.userDeleted"));
        })
        .catch((error) => {
          showActionError(error);
        });
    });
  };

  return (
    <article className="dashboard-card admin-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">{t("admin.users.userEyebrow")}</p>
          <h2>
            {user.display_name ?? user.email ?? t("admin.users.unnamedUser")}
            {user.display_name ? (
              <span className="admin-user-email-inline"> · {user.email}</span>
            ) : null}
          </h2>
          <p className="muted">
            {assignedBoats.length > 0
              ? assignedBoats.map((b) => b.name).join(", ")
              : (locale === "es" ? "Sin barco asignado" : "No boat assigned")}
          </p>
        </div>
        <div className="admin-user-header-actions">
          {!personalMode ? (
            <span className={`status-pill ${user.is_superuser ? "is-good" : "is-muted"}`}>
              {user.is_superuser ? t("admin.users.superuser") : t("admin.users.standardUser")}
            </span>
          ) : null}
          {isSuperuser && !personalMode ? (
            <button
              className="link-button link-button--danger"
              disabled={isPending}
              onClick={deleteUser}
              type="button"
            >
              {isPending ? t("admin.users.deleting") : t("admin.users.deleteUser")}
            </button>
          ) : null}
        </div>
      </div>

      {!personalMode ? (
        <div className="admin-readonly-summary">
          <div className="admin-metrics-grid admin-metrics-grid--readonly">
            {metricCards.map((metric) => (
              <div className="admin-metric-card" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="editor-sections-shell">
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
          <article className="admin-card admin-card--section admin-card--editable">
          <div className="card-header">
            <div>
              <p className="eyebrow">{t("admin.users.sectionGlobal")}</p>
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
              {!personalMode ? (
                <label className="checkbox-field">
                  <input
                    defaultChecked={user.is_superuser}
                    disabled={!isSuperuser}
                    name="is_superuser"
                    type="checkbox"
                  />
                  <span>{t("admin.users.globalSuperuser")}</span>
                </label>
              ) : null}
              <label className="checkbox-field">
                <input
                  defaultChecked={user.is_timeline_public}
                  name="is_timeline_public"
                  type="checkbox"
                />
                <span>{t("admin.users.timelineVisibility")}</span>
              </label>
              {isSuperuser && !personalMode ? (
                <label className="checkbox-field">
                  <input
                    defaultChecked={user.onboarding_pending}
                    name="onboarding_pending"
                    type="checkbox"
                  />
                  <span>{t("admin.users.onboardingGuide")}</span>
                </label>
              ) : null}
            </div>

            <div className="modal__footer">
              <button className="primary-button" disabled={isPending} type="submit">
                {isPending ? t("admin.users.saving") : t("admin.users.saveProfile")}
              </button>
            </div>
          </form>
          </article>
        )}

        {activeSection === "security" && canManageSecurity ? (
          <article className="admin-card admin-card--section admin-card--editable">
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
                {accessSummary ? <p className="muted">{accessSummary}</p> : null}
              </div>
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

        {activeSection === "boat" && canEditPermissions && (
          <article className="admin-card admin-card--section admin-card--editable">
          <div className="card-header">
            <div>
              <p className="eyebrow">{t("admin.users.boatsSection")}</p>
            </div>
          </div>

          <div className="admin-card">
            {singleBoatContext && sortedBoats.length === 1 ? (
              <div className="assigned-boats">
                <span className="muted">{t("admin.users.selectBoat")}</span>
                <div className="assigned-boats__list">
                  <span className="status-pill is-good">{sortedBoats[0]?.name}</span>
                </div>
              </div>
            ) : (
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
                showSelectionPreviewWhenIdle={false}
              />
            )}

            {assignedBoatIds.length > 0 ? (
              <div className="assigned-boats">
                <span className="muted">{t("admin.users.assignedBoats")}</span>
                <div className="assigned-boats__list">
                  <span className="status-pill is-muted">{assignedBoatsSummary}</span>
                </div>
              </div>
            ) : null}

            {selectedBoat ? (
              <div className="permission-list">
                <PermissionEditorRow
                  allowManagerRole={allowManagerRole}
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
        {activeSection === "roles" && canEditPermissions && (
          <article className="admin-card admin-card--section">
            <div className="metrics-table-wrap admin-users-table-wrap">
              {(user.created_users?.length ?? 0) > 0 ? (
                <table className="metrics-table">
                  <thead>
                    <tr>
                      <th>{locale === "es" ? "Usuario" : "User"}</th>
                      <th>{locale === "es" ? "Barco" : "Boat"}</th>
                      <th>{locale === "es" ? "Rol" : "Role"}</th>
                      <th>{locale === "es" ? "Último acceso" : "Last access"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.created_users?.map((createdUser) => {
                      const boat = boats.find((b) => b.id === createdUser.boat_id);
                      const roleLabel =
                        createdUser.permission_level === "manager"
                          ? (locale === "es" ? "Gestor" : "Manager")
                          : createdUser.permission_level === "editor"
                            ? (locale === "es" ? "Editor" : "Editor")
                            : (locale === "es" ? "Lector" : "Viewer");
                      return (
                        <tr key={createdUser.id}>
                          <td>
                            <strong>{createdUser.display_name ?? createdUser.email ?? "—"}</strong>
                            <div className="meta">{createdUser.email ?? "—"}</div>
                          </td>
                          <td><strong>{boat?.name ?? (locale === "es" ? "Sin barco" : "No boat")}</strong></td>
                          <td>
                            <span className={`status-pill ${
                              createdUser.permission_level === "manager" ? "is-good" :
                              createdUser.permission_level === "editor" ? "is-accent" : "is-muted"
                            }`}>{roleLabel}</span>
                          </td>
                          <td className="meta">{formatLastAccess(createdUser.last_sign_in_at, locale)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="muted" style={{ padding: "0.75rem" }}>
                  {locale === "es" ? "Este usuario no ha creado usuarios todavía." : "This user has not created users yet."}
                </p>
              )}
            </div>
          </article>
        )}
      </div>
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
  clearSelectionWhenNoMatch = false,
  showSelectionPreviewWhenIdle = true,
}: {
  label: string;
  placeholder: string;
  options: { id: string; primary: string; secondary?: string; tertiary?: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  emptyText: string;
  name?: string;
  clearSelectionWhenNoMatch?: boolean;
  showSelectionPreviewWhenIdle?: boolean;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = options.filter((option) =>
    [option.primary, option.secondary, option.tertiary]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
  const selected = options.find((option) => option.id === selectedId) ?? filtered[0] ?? options[0];
  const visibleOptions = normalizedQuery
    ? filtered
    : showSelectionPreviewWhenIdle
      ? selected
        ? [selected]
        : filtered.slice(0, 1)
      : [];

  useEffect(() => {
    if (!clearSelectionWhenNoMatch) {
      return;
    }

    if (query.trim() && filtered.length === 0 && selectedId) {
      onSelect("");
    }
  }, [clearSelectionWhenNoMatch, filtered.length, onSelect, query, selectedId]);

  return (
    <div className="search-select">
      {name ? <input name={name} type="hidden" value={selected?.id ?? ""} /> : null}
      <label className="search-select__label">
        <span>{label}</span>
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            selected && !query && showSelectionPreviewWhenIdle
              ? `${selected.primary} · ${selected.secondary ?? ""}`
              : placeholder
          }
          value={query}
        />
      </label>
      <div className="search-select__list">
        {visibleOptions.length ? (
          visibleOptions.map((option) => (
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
          <p className="muted">{normalizedQuery ? emptyText : null}</p>
        )}
      </div>
    </div>
  );
}

function PermissionEditorRow({
  allowManagerRole,
  boat,
  permission,
  userId,
  disabled,
  onSave,
  onDelete,
  locale,
}: {
  allowManagerRole: boolean;
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
          presetHint:
            "Cambiar el perfil aplica permisos recomendados y luego puedes ajustarlos.",
          viewerHelp: "Solo puede consultar el plan y la informacion permitida.",
          editorHelp: "Puede editar el plan, pero no gestionar usuarios.",
          managerHelp:
            "Puede editar, gestionar usuarios y seguir siendo el unico gestor del barco.",
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
          presetHint:
            "Changing the profile applies recommended permissions and you can then fine-tune them.",
          viewerHelp: "Can only review the plan and allowed information.",
          editorHelp: "Can edit the plan, but cannot manage users.",
          managerHelp:
            "Can edit, manage users, and remain the only manager for the boat.",
        };

  const [permissions, setPermissions] = useState<InvitePermissionsState>({
    permissionLevel:
      !allowManagerRole && permission?.permission_level === "manager"
        ? "editor"
        : ((permission?.permission_level as PermissionLevel | undefined) ?? "viewer"),
    canEdit: permission?.can_edit ?? false,
    canViewAllVisits: permission?.can_view_all_visits ?? false,
    canViewVisitNames: permission?.can_view_visit_names ?? false,
    canViewPrivateNotes: permission?.can_view_private_notes ?? false,
    canViewOnlyOwnVisit: permission?.can_view_only_own_visit ?? false,
    canManageBoatUsers: allowManagerRole && (permission?.can_manage_boat_users ?? false),
    canViewAvailability: permission?.can_view_availability ?? false,
  });

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
      <input name="permission_level" type="hidden" value={permissions.permissionLevel} />

      <div className="permission-row__header">
        <div>
          <p className="muted">{permission ? text.existing : text.none}</p>
        </div>
      </div>

      <div className="permission-presets">
        {([
          ["viewer", text.viewer, text.viewerHelp],
          ["editor", text.editor, text.editorHelp],
          ...(allowManagerRole
            ? ([["manager", text.manager, text.managerHelp]] as const)
            : []),
        ] as const).map(([value, label]) => (
          <button
            className={`permission-preset${permissions.permissionLevel === value ? " is-active" : ""}`}
            key={value}
            onClick={() => setPermissions(getPermissionPreset(value))}
            title={
              value === "viewer"
                ? text.viewerHelp
                : value === "editor"
                  ? text.editorHelp
                  : text.managerHelp
            }
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <p className="muted">{text.presetHint}</p>

      <div className="permission-grid">
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
        {allowManagerRole ? (
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
        ) : null}
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
