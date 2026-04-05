"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { BoatSettingsDialog } from "@/components/boats/boat-settings-dialog";
import { useI18n } from "@/components/i18n/provider";
import { BoatPlaceholder } from "@/components/ui/boat-placeholder";
import { Dialog } from "@/components/ui/dialog";
import type { BoatDetails } from "@/lib/planning";

type BoatsAdminProps = {
  boats: BoatDetails[];
  onSave: (fd: FormData) => Promise<void | { id: string }>;
  onUploadImage: (fd: FormData) => Promise<void>;
  onRemoveImage: (fd: FormData) => Promise<void>;
  onDelete: (fd: FormData) => Promise<void>;
};

const formatLastAccess = (value: string | null | undefined, locale: "es" | "en") => {
  if (!value) {
    return locale === "es" ? "Sin acceso" : "No access";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

type SortCol =
  | "name"
  | "model"
  | "homePort"
  | "users"
  | "managers"
  | "editors"
  | "trips"
  | "visits"
  | "lastAccess"
  | "status";
type SortDir = "asc" | "desc";

export function BoatsAdmin({
  boats,
  onSave,
  onUploadImage,
  onRemoveImage,
  onDelete,
}: BoatsAdminProps) {
  const { locale } = useI18n();
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [expandedBoatId, setExpandedBoatId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [sortCol, setSortCol] = useState<SortCol>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const text =
    locale === "es"
      ? {
          title: "Gestionar barcos",
          subtitle: "Vista tabular para buscar, revisar y accionar cada barco rápidamente.",
          createBoat: "Añadir barco",
          creating: "Creando...",
          search: "Buscar barco",
          searchPlaceholder: "Nombre, puerto, propietario o correo",
          noMatches: "Ningún barco coincide con la búsqueda.",
          tableImage: "Imagen",
          tableBoat: "Barco",
          tableModel: "Modelo",
          tableHomePort: "Puerto",
          tableUsers: "Usuarios",
          tableUsersAbbr: "Usr",
          tableManagers: "Gestores",
          tableManagersAbbr: "Gest",
          tableEditors: "Editores",
          tableEditorsAbbr: "Ed",
          tableTrips: "Tramos",
          tableTripsAbbr: "Tr",
          tableVisits: "Visitas",
          tableVisitsAbbr: "Vis",
          tableLastAccess: "Último acceso",
          tableLastAccessAbbr: "Acceso",
          tableStatus: "Estado",
          tableStatusAbbr: "Est",
          tableActions: "Acciones",
          active: "Activo",
          inactive: "Inactivo",
          expand: "Ampliar",
          edit: "Editar",
          delete: "Borrar",
          deleteConfirm:
            "¿Borrar el barco \"{name}\"? Esto también elimina sus temporadas, tramos, visitas, permisos y los lectores, editores o gestores asignados solo a este barco.",
          deleted: "Barco borrado",
          deleteError: "No se pudo borrar el barco",
          createTitle: "Crear barco",
          createSubtitle: "Alta rápida para incorporarlo a la flota.",
          name: "Nombre",
          model: "Modelo",
          yearBuilt: "Año de construcción",
          homePort: "Puerto base",
          description: "Descripción",
          notes: "Notas internas",
          isActive: "Barco activo",
          saveCreate: "Crear barco",
          saveError: "No se pudo crear el barco",
          expandedTitle: "Resumen del barco",
        }
      : {
          title: "Manage boats",
          subtitle: "Tabular view to quickly search, review and act on each boat.",
          createBoat: "Add boat",
          creating: "Creating...",
          search: "Search boat",
          searchPlaceholder: "Name, port, owner or owner email",
          noMatches: "No boats match the current search.",
          tableImage: "Image",
          tableBoat: "Boat",
          tableModel: "Model",
          tableHomePort: "Port",
          tableUsers: "Users",
          tableUsersAbbr: "Usr",
          tableManagers: "Managers",
          tableManagersAbbr: "Mgr",
          tableEditors: "Editors",
          tableEditorsAbbr: "Ed",
          tableTrips: "Trips",
          tableTripsAbbr: "Tr",
          tableVisits: "Visits",
          tableVisitsAbbr: "Vis",
          tableLastAccess: "Last access",
          tableLastAccessAbbr: "Access",
          tableStatus: "Status",
          tableStatusAbbr: "St",
          tableActions: "Actions",
          active: "Active",
          inactive: "Inactive",
          expand: "Expand",
          edit: "Edit",
          delete: "Delete",
          deleteConfirm:
            'Delete boat "{name}"? This also removes its seasons, trips, visits, permissions, and any readers, editors, or managers assigned only to this boat.',
          deleted: "Boat deleted",
          deleteError: "Could not delete boat",
          createTitle: "Create boat",
          createSubtitle: "Quick registration to add it to the fleet.",
          name: "Name",
          model: "Model",
          yearBuilt: "Year built",
          homePort: "Home port",
          description: "Description",
          notes: "Internal notes",
          isActive: "Boat active",
          saveCreate: "Create boat",
          saveError: "Could not create boat",
          expandedTitle: "Boat summary",
        };

  const filteredBoats = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = query
      ? boats.filter((boat) =>
          [boat.name, boat.home_port, boat.description, boat.user_display_name, boat.user_email]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query),
        )
      : [...boats];

    return list.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case "name":
          cmp = a.name.localeCompare(b.name, locale);
          break;
        case "model":
          cmp = (a.model ?? "").localeCompare(b.model ?? "", locale);
          break;
        case "homePort":
          cmp = (a.home_port ?? "").localeCompare(b.home_port ?? "", locale);
          break;
        case "users":
          cmp = (a.users_count ?? 0) - (b.users_count ?? 0);
          break;
        case "managers":
          cmp = (a.managers_count ?? 0) - (b.managers_count ?? 0);
          break;
        case "editors":
          cmp = (a.editors_count ?? 0) - (b.editors_count ?? 0);
          break;
        case "trips":
          cmp = (a.trip_segments_count ?? 0) - (b.trip_segments_count ?? 0);
          break;
        case "visits":
          cmp = (a.visits_count ?? 0) - (b.visits_count ?? 0);
          break;
        case "lastAccess":
          cmp = (a.user_last_access_at ?? "").localeCompare(b.user_last_access_at ?? "");
          break;
        case "status":
          cmp = Number(b.is_active) - Number(a.is_active);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [boats, locale, search, sortCol, sortDir]);

  const expandedBoat = useMemo(
    () => filteredBoats.find((boat) => boat.id === expandedBoatId) ?? boats.find((boat) => boat.id === expandedBoatId) ?? null,
    [boats, expandedBoatId, filteredBoats],
  );

  const handleCreateBoat = (formData: FormData) => {
    startTransition(() => {
      void onSave(formData)
        .then(() => {
          toast.success(text.saveCreate);
          setIsCreating(false);
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : text.saveError);
        });
    });
  };

  const handleDeleteBoat = (boat: BoatDetails) => {
    if (!confirm(text.deleteConfirm.replace("{name}", boat.name))) {
      return;
    }

    const formData = new FormData();
    formData.set("boat_id", boat.id);

    startTransition(() => {
      void onDelete(formData)
        .then(() => {
          toast.success(text.deleted);
          if (expandedBoatId === boat.id) {
            setExpandedBoatId(null);
          }
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : text.deleteError);
        });
    });
  };

  return (
    <section className="admin-stack">
      <article className="dashboard-card admin-card admin-boats-actions">
        <div>
          <p className="eyebrow">{text.title}</p>
          <p className="muted">{text.subtitle}</p>
        </div>
        <button className="primary-button" onClick={() => setIsCreating(true)} type="button">
          + {text.createBoat}
        </button>
      </article>

      <article className="dashboard-card admin-card">
        <div className="form-grid">
          <label className="form-grid__wide">
            <span>{text.search}</span>
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder={text.searchPlaceholder}
              value={search}
            />
          </label>
        </div>

        {filteredBoats.length ? (
          <div className="metrics-table-wrap">
            <table className="metrics-table admin-boats-table">
              <thead>
                <tr>
                  <th>{text.tableImage}</th>
                  <th
                    className={`sortable-th${sortCol === "name" ? " is-sorted" : ""}`}
                    onClick={() => handleSort("name")}
                  >
                    {text.tableBoat}
                    <span className="sort-icon">{sortCol === "name" ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}</span>
                  </th>
                  <th
                    className={`sortable-th${sortCol === "model" ? " is-sorted" : ""}`}
                    onClick={() => handleSort("model")}
                  >
                    {text.tableModel}
                    <span className="sort-icon">{sortCol === "model" ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}</span>
                  </th>
                  <th
                    className={`sortable-th${sortCol === "homePort" ? " is-sorted" : ""}`}
                    onClick={() => handleSort("homePort")}
                  >
                    {text.tableHomePort}
                    <span className="sort-icon">{sortCol === "homePort" ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}</span>
                  </th>
                  <th
                    className={`sortable-th admin-boats-table__num${sortCol === "users" ? " is-sorted" : ""}`}
                    onClick={() => handleSort("users")}
                    title={text.tableUsers}
                  >
                    {text.tableUsersAbbr}<span className="sort-icon">{sortCol === "users" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                  </th>
                  <th
                    className={`sortable-th admin-boats-table__num${sortCol === "managers" ? " is-sorted" : ""}`}
                    onClick={() => handleSort("managers")}
                    title={text.tableManagers}
                  >
                    {text.tableManagersAbbr}<span className="sort-icon">{sortCol === "managers" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                  </th>
                  <th
                    className={`sortable-th admin-boats-table__num${sortCol === "editors" ? " is-sorted" : ""}`}
                    onClick={() => handleSort("editors")}
                    title={text.tableEditors}
                  >
                    {text.tableEditorsAbbr}<span className="sort-icon">{sortCol === "editors" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                  </th>
                  <th
                    className={`sortable-th admin-boats-table__num${sortCol === "trips" ? " is-sorted" : ""}`}
                    onClick={() => handleSort("trips")}
                    title={text.tableTrips}
                  >
                    {text.tableTripsAbbr}<span className="sort-icon">{sortCol === "trips" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                  </th>
                  <th
                    className={`sortable-th admin-boats-table__num${sortCol === "visits" ? " is-sorted" : ""}`}
                    onClick={() => handleSort("visits")}
                    title={text.tableVisits}
                  >
                    {text.tableVisitsAbbr}<span className="sort-icon">{sortCol === "visits" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                  </th>
                  <th
                    className={`sortable-th${sortCol === "lastAccess" ? " is-sorted" : ""}`}
                    onClick={() => handleSort("lastAccess")}
                    title={text.tableLastAccess}
                  >
                    {text.tableLastAccessAbbr}<span className="sort-icon">{sortCol === "lastAccess" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                  </th>
                  <th
                    className={`sortable-th admin-boats-table__num${sortCol === "status" ? " is-sorted" : ""}`}
                    onClick={() => handleSort("status")}
                    title={text.tableStatus}
                  >
                    {text.tableStatusAbbr}<span className="sort-icon">{sortCol === "status" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                  </th>
                  <th>{text.tableActions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBoats.map((boat) => (
                  <tr key={boat.id}>
                    <td>
                      {boat.image_url ? (
                        <img alt={boat.name} className="admin-boats-table__thumb" src={boat.image_url} />
                      ) : (
                        <BoatPlaceholder className="admin-boats-table__thumb admin-boats-table__thumb--empty" title={boat.name} />
                      )}
                    </td>
                    <td>
                      <strong>{boat.name}</strong>
                      <div className="meta">{boat.user_display_name ?? "—"}</div>
                    </td>
                    <td>{boat.model ?? "—"}</td>
                    <td>{boat.home_port ?? "—"}</td>
                    <td className="admin-boats-table__num">{boat.users_count ?? 0}</td>
                    <td className="admin-boats-table__num">{boat.managers_count ?? 0}</td>
                    <td className="admin-boats-table__num">{boat.editors_count ?? 0}</td>
                    <td className="admin-boats-table__num">{boat.trip_segments_count ?? 0}</td>
                    <td className="admin-boats-table__num">{boat.visits_count ?? 0}</td>
                    <td className="meta">{formatLastAccess(boat.user_last_access_at, locale)}</td>
                    <td className="admin-boats-table__num">
                      <span className={`status-pill ${boat.is_active ? "is-good" : "is-muted"}`}>
                        {boat.is_active ? text.active : text.inactive}
                      </span>
                    </td>
                    <td>
                      <div className="admin-boats-table__actions">
                        <button
                          aria-label={text.expand}
                          className="admin-table-icon-btn"
                          onClick={() => setExpandedBoatId(boat.id)}
                          title={text.expand}
                          type="button"
                        >
                          🔍
                        </button>

                        <BoatSettingsDialog
                          boatId={boat.id}
                          boat={boat}
                          onRemoveImage={onRemoveImage}
                          onSave={async (fd) => {
                            await onSave(fd);
                          }}
                          onUploadImage={onUploadImage}
                          triggerClassName="admin-table-icon-btn"
                          triggerLabel="✏️"
                          triggerTitle={text.edit}
                        />

                        <button
                          aria-label={text.delete}
                          className="admin-table-icon-btn admin-table-icon-btn--danger"
                          disabled={isPending}
                          onClick={() => handleDeleteBoat(boat)}
                          title={text.delete}
                          type="button"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">{text.noMatches}</p>
        )}
      </article>

      <Dialog onClose={() => setIsCreating(false)} open={isCreating} title={text.createTitle}>
        <form
          className="editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleCreateBoat(new FormData(event.currentTarget));
          }}
        >
          <p className="muted">{text.createSubtitle}</p>

          <div className="form-grid">
            <label>
              <span>{text.name}</span>
              <input name="name" required />
            </label>
            <label>
              <span>{text.model}</span>
              <input name="model" />
            </label>
            <label>
              <span>{text.yearBuilt}</span>
              <input min={1900} name="year_built" type="number" />
            </label>
            <label>
              <span>{text.homePort}</span>
              <input name="home_port" />
            </label>
            <label className="form-grid__wide">
              <span>{text.description}</span>
              <textarea name="description" rows={2} />
            </label>
            <label className="form-grid__wide">
              <span>{text.notes}</span>
              <textarea name="notes" rows={3} />
            </label>
            <label className="checkbox-field">
              <input defaultChecked name="is_active" type="checkbox" />
              <span>{text.isActive}</span>
            </label>
          </div>

          <div className="modal__footer">
            <button className="primary-button" disabled={isPending} type="submit">
              {isPending ? text.creating : text.saveCreate}
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog
        onClose={() => setExpandedBoatId(null)}
        open={Boolean(expandedBoat)}
        title={text.expandedTitle}
      >
        {expandedBoat ? (
          <div className="editor-form">
            <div className="admin-boat-grid">
              <div className="boat-image-card">
                {expandedBoat.image_url ? (
                  <img alt={expandedBoat.name} className="boat-image" src={expandedBoat.image_url} />
                ) : (
                  <BoatPlaceholder className="boat-image boat-image--empty" title={expandedBoat.name} />
                )}
              </div>
              <div className="editor-form">
                <div className="admin-boat-summary">
                  <div>
                    <p><strong>{expandedBoat.name}</strong></p>
                    <p className="muted">{expandedBoat.description ?? "—"}</p>
                  </div>
                  <div className="boat-card__stats">
                    <span>{text.tableUsers}: {expandedBoat.users_count ?? 0}</span>
                    <span>{text.tableManagers}: {expandedBoat.managers_count ?? 0}</span>
                    <span>{text.tableEditors}: {expandedBoat.editors_count ?? 0}</span>
                    <span>{text.tableTrips}: {expandedBoat.trip_segments_count ?? 0}</span>
                    <span>{text.tableVisits}: {expandedBoat.visits_count ?? 0}</span>
                    <span>{locale === "es" ? "Invitaciones activas" : "Active invites"}: {expandedBoat.active_invites_count ?? 0}</span>
                  </div>
                  <div className="season-access-meta">
                    <span><strong>{text.tableModel}:</strong> {expandedBoat.model ?? "—"}</span>
                    <span><strong>{text.tableHomePort}:</strong> {expandedBoat.home_port ?? "—"}</span>
                    <span>
                      <strong>{text.tableStatus}:</strong>{" "}
                      {expandedBoat.is_active ? text.active : text.inactive}
                    </span>
                    <span>
                      <strong>{text.tableLastAccess}:</strong>{" "}
                      {formatLastAccess(expandedBoat.user_last_access_at, locale)}
                    </span>
                    <span>
                      <strong>{locale === "es" ? "Titular" : "Owner"}:</strong>{" "}
                      {expandedBoat.user_display_name ?? expandedBoat.user_email ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Dialog>
    </section>
  );
}
