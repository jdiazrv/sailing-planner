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
          tableTrips: "Tramos",
          tableVisits: "Visitas",
          tableLastAccess: "Último acceso",
          tableStatus: "Estado",
          tableActions: "Acciones",
          active: "Activo",
          inactive: "Inactivo",
          expand: "Ampliar",
          edit: "Editar",
          delete: "Borrar",
          deleteConfirm:
            "¿Borrar el barco \"{name}\"? Esto también elimina sus temporadas, tramos, visitas y permisos.",
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
          tableTrips: "Trips",
          tableVisits: "Visits",
          tableLastAccess: "Last access",
          tableStatus: "Status",
          tableActions: "Actions",
          active: "Active",
          inactive: "Inactive",
          expand: "Expand",
          edit: "Edit",
          delete: "Delete",
          deleteConfirm:
            'Delete boat "{name}"? This also removes its seasons, trips, visits and permissions.',
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
    if (!query) {
      return [...boats].sort((a, b) => a.name.localeCompare(b.name, locale));
    }

    return boats
      .filter((boat) =>
        [boat.name, boat.home_port, boat.description, boat.user_display_name, boat.user_email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [boats, locale, search]);

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
                  <th>{text.tableBoat}</th>
                  <th>{text.tableModel}</th>
                  <th>{text.tableHomePort}</th>
                  <th style={{ textAlign: "right" }}>{text.tableUsers}</th>
                  <th style={{ textAlign: "right" }}>{text.tableTrips}</th>
                  <th style={{ textAlign: "right" }}>{text.tableVisits}</th>
                  <th>{text.tableLastAccess}</th>
                  <th>{text.tableStatus}</th>
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
                    <td style={{ textAlign: "right" }}>{boat.users_count ?? 0}</td>
                    <td style={{ textAlign: "right" }}>{boat.trip_segments_count ?? 0}</td>
                    <td style={{ textAlign: "right" }}>{boat.visits_count ?? 0}</td>
                    <td className="meta">{formatLastAccess(boat.user_last_access_at, locale)}</td>
                    <td>
                      <span className={`status-pill ${boat.is_active ? "is-good" : "is-muted"}`}>
                        {boat.is_active ? text.active : text.inactive}
                      </span>
                    </td>
                    <td>
                      <div className="admin-boats-table__actions">
                        <button
                          className="secondary-button secondary-button--small"
                          onClick={() => setExpandedBoatId(boat.id)}
                          type="button"
                        >
                          {text.expand}
                        </button>

                        <BoatSettingsDialog
                          boat={boat}
                          onRemoveImage={onRemoveImage}
                          onSave={async (fd) => {
                            await onSave(fd);
                          }}
                          onUploadImage={onUploadImage}
                          triggerClassName="secondary-button secondary-button--small"
                          triggerLabel={text.edit}
                        />

                        <button
                          className="link-button link-button--danger"
                          disabled={isPending}
                          onClick={() => handleDeleteBoat(boat)}
                          type="button"
                        >
                          {text.delete}
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
                <p><strong>{expandedBoat.name}</strong></p>
                <p className="muted">{expandedBoat.description ?? "—"}</p>
                <p><strong>{text.tableModel}:</strong> {expandedBoat.model ?? "—"}</p>
                <p><strong>{text.tableHomePort}:</strong> {expandedBoat.home_port ?? "—"}</p>
                <p><strong>{text.tableUsers}:</strong> {expandedBoat.users_count ?? 0}</p>
                <p><strong>{text.tableTrips}:</strong> {expandedBoat.trip_segments_count ?? 0}</p>
                <p><strong>{text.tableVisits}:</strong> {expandedBoat.visits_count ?? 0}</p>
              </div>
            </div>
          </div>
        ) : null}
      </Dialog>
    </section>
  );
}
