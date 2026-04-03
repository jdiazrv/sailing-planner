"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n/provider";
import { BoatPlaceholder } from "@/components/ui/boat-placeholder";
import type { BoatDetails } from "@/lib/planning";

type BoatsAdminProps = {
  boats: BoatDetails[];
  onSave: (fd: FormData) => Promise<void | { id: string }>;
  onUploadImage: (fd: FormData) => Promise<void>;
  onRemoveImage: (fd: FormData) => Promise<void>;
  onDelete: (fd: FormData) => Promise<void>;
};

type BoatEditorValue = {
  id?: string;
  image_path?: string | null;
  image_url?: string | null;
  trip_segments_count?: number;
  visits_count?: number;
  active_invites_count?: number;
  user_last_access_at?: string | null;
  user_display_name?: string | null;
  users_count?: number;
  name: string;
  description: string | null | "";
  model: string | null | "";
  year_built: number | string | null | "";
  home_port: string | null | "";
  notes: string | null | "";
  is_active: boolean;
};

const emptyBoatDraft = {
  name: "",
  description: "",
  model: "",
  year_built: "",
  home_port: "",
  notes: "",
  is_active: true,
};

export function BoatsAdmin({
  boats,
  onSave,
  onUploadImage,
  onRemoveImage,
  onDelete,
}: BoatsAdminProps) {
  const { locale } = useI18n();
  const useCompactSelector = boats.length > 12;
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBoatId, setSelectedBoatId] = useState("");
  const filteredBoats = useMemo(
    () =>
      boats.filter((boat) =>
        [boat.name, boat.home_port, boat.description, boat.user_display_name, boat.user_email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      ),
    [boats, search],
  );
  const sortedBoats = useMemo(
    () => [...boats].sort((a, b) => a.name.localeCompare(b.name, locale)),
    [boats, locale],
  );
  const selectedBoat =
    sortedBoats.find((boat) => boat.id === selectedBoatId) ??
    boats.find((boat) => boat.id === selectedBoatId) ??
    null;

  const text =
    locale === "es"
      ? {
          eyebrow: "Administración de barcos",
          manage: "Gestionar barcos",
          addBoat: "Añadir barco",
          search: "Buscar barco",
          searchHelp:
            "Busca por nombre del barco, propietario o correo del propietario para abrir una sola ficha.",
          noMatches: "Ningún barco coincide con la búsqueda.",
          noBoatSelected:
            "Escribe para buscar un barco por nombre, propietario o correo y abre una sola ficha para gestionarlo.",
        }
      : {
          eyebrow: "Boat administration",
          manage: "Manage boats",
          addBoat: "Add boat",
          search: "Search boat",
          searchHelp:
            "Search by boat name, owner or owner email to open a single card.",
          noMatches: "No boats match the current search.",
          noBoatSelected:
            "Type to search a boat by name, owner or owner email and open a single card to manage it.",
        };

  return (
    <section className="admin-stack">
      <article className="dashboard-card admin-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">{text.eyebrow}</p>
            <h2>{useCompactSelector ? text.manage : text.search}</h2>
            {useCompactSelector ? <p className="muted">{text.searchHelp}</p> : null}
          </div>
          <button
            className="primary-button"
            onClick={() => setIsCreating((value) => !value)}
            type="button"
          >
            + {text.addBoat}
          </button>
        </div>
        <div className="form-grid">
          <label className="form-grid__wide">
            <span>{text.search}</span>
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder={text.search}
              value={search}
            />
          </label>
        </div>
        {useCompactSelector ? (
          <div className="search-select">
            <div className="search-select__list">
              {search.trim().length ? (
                filteredBoats.length ? (
                  filteredBoats.map((boat) => (
                    <button
                      className={`search-select__option${boat.id === selectedBoatId ? " is-active" : ""}`}
                      key={boat.id}
                      onClick={() => {
                        setSelectedBoatId(boat.id);
                        setSearch("");
                      }}
                      type="button"
                    >
                      <strong>{boat.name}</strong>
                      <span>{boat.user_display_name ?? (locale === "es" ? "Sin propietario visible" : "No visible owner")}</span>
                      <span>{boat.user_email ?? boat.home_port ?? "—"}</span>
                    </button>
                  ))
                ) : (
                  <p className="muted">{text.noMatches}</p>
                )
              ) : (
                <p className="muted">{text.noBoatSelected}</p>
              )}
            </div>
          </div>
        ) : null}
      </article>

      {isCreating ? (
        <BoatEditorCard
          boat={emptyBoatDraft}
          onCreated={() => {
            setIsCreating(false);
            setSearch("");
          }}
          onDelete={onDelete}
          onSave={onSave}
          title={text.addBoat}
        />
      ) : null}

      {useCompactSelector ? (
        selectedBoat ? (
          <BoatEditorCard
            boat={selectedBoat}
            key={selectedBoat.id}
            onDelete={onDelete}
            onRemoveImage={onRemoveImage}
            onSave={onSave}
            onUploadImage={onUploadImage}
            title={selectedBoat.name}
          />
        ) : (
          <article className="dashboard-card">
            <p className="muted">{text.noBoatSelected}</p>
          </article>
        )
      ) : filteredBoats.length ? (
        filteredBoats.map((boat) => (
          <BoatEditorCard
            boat={boat}
            key={boat.id}
            onDelete={onDelete}
            onRemoveImage={onRemoveImage}
            onSave={onSave}
            onUploadImage={onUploadImage}
            title={boat.name}
          />
        ))
      ) : (
        <article className="dashboard-card">
          <p className="muted">{text.noMatches}</p>
        </article>
      )}
    </section>
  );
}

function BoatEditorCard({
  boat,
  title,
  onCreated,
  onSave,
  onUploadImage,
  onRemoveImage,
  onDelete,
}: {
  boat: BoatEditorValue;
  title: string;
  onCreated?: () => void;
  onSave: (fd: FormData) => Promise<void | { id: string }>;
  onUploadImage?: (fd: FormData) => Promise<void>;
  onRemoveImage?: (fd: FormData) => Promise<void>;
  onDelete: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const { locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [imageFile, setImageFile] = useState<File | null>(null);

  const text =
    locale === "es"
      ? {
          boat: "Barco",
          newBoat: "Nuevo barco",
          active: "Activo",
          inactive: "Inactivo",
          users: "Usuarios",
          invites: "Invitaciones",
          segments: "Tramos",
          visits: "Visitas",
          lastAccess: "Último acceso",
          noAccess: "Sin acceso",
          noImage: "Sin imagen",
          boatImage: "Imagen del barco",
          uploadImage: "Subir imagen",
          removeImage: "Quitar imagen",
          saveFirst: "Guarda primero el barco para poder subir su imagen.",
          name: "Nombre",
          model: "Modelo",
          yearBuilt: "Año de construcción",
          homePort: "Puerto base",
          description: "Descripción",
          notes: "Notas internas",
          boatActive: "Barco activo",
          saving: "Guardando...",
          saveBoat: "Guardar barco",
          createBoat: "Crear barco",
          deleteBoat: "Borrar barco",
          saved: boat.id ? "Barco actualizado" : "Barco creado",
          saveError: "No se pudo guardar el barco",
          imageUpdated: "Imagen del barco actualizada",
          imageUpdateError: "No se pudo subir la imagen",
          imageRemoved: "Imagen del barco eliminada",
          imageRemoveError: "No se pudo eliminar la imagen",
          deleteConfirm:
            "¿Borrar el barco \"{name}\"? Esto también elimina sus temporadas, tramos, visitas y permisos.",
          deleted: "Barco borrado",
          deleteError: "No se pudo borrar el barco",
        }
      : {
          boat: "Boat",
          newBoat: "New boat",
          active: "Active",
          inactive: "Inactive",
          users: "Users",
          invites: "Invites",
          segments: "Segments",
          visits: "Visits",
          lastAccess: "Last access",
          noAccess: "No access",
          noImage: "No image",
          boatImage: "Boat image",
          uploadImage: "Upload image",
          removeImage: "Remove image",
          saveFirst: "Save the boat first to upload its image.",
          name: "Name",
          model: "Model",
          yearBuilt: "Year built",
          homePort: "Home port",
          description: "Description",
          notes: "Internal notes",
          boatActive: "Boat active",
          saving: "Saving...",
          saveBoat: "Save boat",
          createBoat: "Create boat",
          deleteBoat: "Delete boat",
          saved: boat.id ? "Boat updated" : "Boat created",
          saveError: "Could not save boat",
          imageUpdated: "Boat image updated",
          imageUpdateError: "Could not upload boat image",
          imageRemoved: "Boat image removed",
          imageRemoveError: "Could not remove boat image",
          deleteConfirm:
            'Delete boat "{name}"? This also removes its seasons, trips, visits and permissions.',
          deleted: "Boat deleted",
          deleteError: "Could not delete boat",
        };

  const saveBoat = (formData: FormData) => {
    startTransition(async () => {
      try {
        const result = await onSave(formData);
        toast.success(text.saved);
        if (!boat.id && result && "id" in result && result.id) {
          router.prefetch(`/boats/${result.id}/trip`);
          onCreated?.();
        }
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : text.saveError);
      }
    });
  };

  const uploadImage = () => {
    if (!boat.id || !imageFile || !onUploadImage) {
      return;
    }

    const formData = new FormData();
    formData.set("boat_id", boat.id);
    formData.set("image", imageFile);

    startTransition(async () => {
      try {
        await onUploadImage(formData);
        toast.success(text.imageUpdated);
        setImageFile(null);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : text.imageUpdateError);
      }
    });
  };

  const removeImage = () => {
    if (!boat.id || !onRemoveImage) {
      return;
    }

    const formData = new FormData();
    formData.set("boat_id", boat.id);

    startTransition(async () => {
      try {
        await onRemoveImage(formData);
        toast.success(text.imageRemoved);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : text.imageRemoveError);
      }
    });
  };

  const deleteBoat = () => {
    if (!boat.id) {
      return;
    }
    if (!confirm(text.deleteConfirm.replace("{name}", boat.name))) {
      return;
    }

    const formData = new FormData();
    formData.set("boat_id", boat.id);

    startTransition(async () => {
      try {
        await onDelete(formData);
        toast.success(text.deleted);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : text.deleteError);
      }
    });
  };

  return (
    <article className="dashboard-card admin-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">{boat.id ? text.boat : text.newBoat}</p>
          <h2>{title}</h2>
        </div>
        <span className={`status-pill ${boat.is_active ? "is-good" : "is-muted"}`}>
          {boat.is_active ? text.active : text.inactive}
        </span>
      </div>

      {boat.id ? (
        <div className="admin-boat-summary">
          <span>{text.users}: {boat.users_count ?? 0}</span>
          <span>{text.invites}: {boat.active_invites_count ?? 0}</span>
          <span>{text.segments}: {boat.trip_segments_count ?? 0}</span>
          <span>{text.visits}: {boat.visits_count ?? 0}</span>
          <span>
            {text.lastAccess}:{" "}
            {boat.user_last_access_at
              ? new Intl.DateTimeFormat(locale, {
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(boat.user_last_access_at))
              : text.noAccess}
          </span>
          {boat.user_display_name ? <span>{boat.user_display_name}</span> : null}
        </div>
      ) : null}

      <div className="admin-boat-grid">
        <div className="boat-image-card">
          {boat.image_url ? (
            <img alt={boat.name} className="boat-image" src={boat.image_url} />
          ) : (
            <BoatPlaceholder
              className="boat-image boat-image--empty"
              title={text.noImage}
            />
          )}

          {boat.id && onUploadImage ? (
            <div className="editor-form editor-form--dense">
              <label>
                <span>{text.boatImage}</span>
                <input
                  accept="image/*"
                  disabled={isPending}
                  onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
              </label>
              <div className="inline-actions">
                <button
                  className="primary-button"
                  disabled={isPending || !imageFile}
                  onClick={uploadImage}
                  type="button"
                >
                  {text.uploadImage}
                </button>
                {boat.image_path ? (
                  <button
                    className="link-button link-button--danger"
                    disabled={isPending}
                    onClick={removeImage}
                    type="button"
                  >
                    {text.removeImage}
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="muted">{text.saveFirst}</p>
          )}
        </div>

        <form
          className="editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            saveBoat(new FormData(event.currentTarget));
          }}
        >
          {boat.id ? <input name="boat_id" type="hidden" value={boat.id} /> : null}

          <div className="form-grid">
            <label>
              <span>{text.name}</span>
              <input defaultValue={boat.name} name="name" required />
            </label>
            <label>
              <span>{text.model}</span>
              <input defaultValue={boat.model ?? ""} name="model" />
            </label>
            <label>
              <span>{text.yearBuilt}</span>
              <input
                defaultValue={boat.year_built ?? ""}
                min={1900}
                name="year_built"
                type="number"
              />
            </label>
            <label>
              <span>{text.homePort}</span>
              <input defaultValue={boat.home_port ?? ""} name="home_port" />
            </label>
            <label className="form-grid__wide">
              <span>{text.description}</span>
              <textarea defaultValue={boat.description ?? ""} name="description" rows={2} />
            </label>
            <label className="form-grid__wide">
              <span>{text.notes}</span>
              <textarea defaultValue={boat.notes ?? ""} name="notes" rows={3} />
            </label>
            <label className="checkbox-field">
              <input defaultChecked={boat.is_active} name="is_active" type="checkbox" />
              <span>{text.boatActive}</span>
            </label>
          </div>

          <div className="modal__footer">
            <button className="primary-button" disabled={isPending} type="submit">
              {isPending ? text.saving : boat.id ? text.saveBoat : text.createBoat}
            </button>
            {boat.id ? (
              <button
                className="link-button link-button--danger"
                disabled={isPending}
                onClick={deleteBoat}
                type="button"
              >
                {text.deleteBoat}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </article>
  );
}
