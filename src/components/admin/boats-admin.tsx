"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n/provider";
import type { BoatDetails } from "@/lib/planning";

type BoatsAdminProps = {
  boats: BoatDetails[];
  onSave: (fd: FormData) => Promise<void>;
  onUploadImage: (fd: FormData) => Promise<void>;
  onRemoveImage: (fd: FormData) => Promise<void>;
  onDelete: (fd: FormData) => Promise<void>;
};

type BoatEditorValue = {
  id?: string;
  image_path?: string | null;
  image_url?: string | null;
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
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const filteredBoats = useMemo(
    () =>
      boats.filter((boat) =>
        [boat.name, boat.home_port, boat.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      ),
    [boats, search],
  );

  const text =
    locale === "es"
      ? {
          eyebrow: "Administración de barcos",
          title: "Flota",
          body:
            "Actualiza los datos del barco, la imagen de portada y la información base de cada espacio de trabajo.",
          addBoat: "Añadir barco",
          search: "Buscar barco",
          noMatches: "Ningún barco coincide con la búsqueda.",
        }
      : {
          eyebrow: "Boat administration",
          title: "Fleet",
          body:
            "Update the core boat record, cover image and planning metadata for every workspace.",
          addBoat: "Add boat",
          search: "Search boat",
          noMatches: "No boats match the current search.",
        };

  return (
    <section className="admin-stack">
      <article className="dashboard-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">{text.eyebrow}</p>
            <h2>{text.title}</h2>
          </div>
          <span className="badge">{boats.length}</span>
        </div>
        <p className="muted">{text.body}</p>
      </article>

      <article className="dashboard-card admin-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">{text.eyebrow}</p>
            <h2>{text.search}</h2>
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
      </article>

      {isCreating ? (
        <BoatEditorCard
          boat={emptyBoatDraft}
          onDelete={onDelete}
          onSave={onSave}
          title={text.addBoat}
        />
      ) : null}

      {filteredBoats.length ? (
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
  onSave,
  onUploadImage,
  onRemoveImage,
  onDelete,
}: {
  boat: BoatEditorValue;
  title: string;
  onSave: (fd: FormData) => Promise<void>;
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
        await onSave(formData);
        toast.success(text.saved);
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

      <div className="admin-boat-grid">
        <div className="boat-image-card">
          {boat.image_url ? (
            <img alt={boat.name} className="boat-image" src={boat.image_url} />
          ) : (
            <div className="boat-image boat-image--empty">{text.noImage}</div>
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
