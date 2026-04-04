"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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

type BoatFormSnapshot = {
  name: string;
  model: string;
  year_built: string;
  home_port: string;
  description: string;
  notes: string;
  is_active: boolean;
};

const buildBoatFormSnapshot = (boat: BoatEditorValue): BoatFormSnapshot => ({
  name: String(boat.name ?? ""),
  model: String(boat.model ?? ""),
  year_built: String(boat.year_built ?? ""),
  home_port: String(boat.home_port ?? ""),
  description: String(boat.description ?? ""),
  notes: String(boat.notes ?? ""),
  is_active: Boolean(boat.is_active),
});

const readBoatFormSnapshot = (form: HTMLFormElement): BoatFormSnapshot => {
  const getText = (name: keyof Omit<BoatFormSnapshot, "is_active">) =>
    (form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? "";
  const active = form.elements.namedItem("is_active") as HTMLInputElement | null;

  return {
    name: getText("name"),
    model: getText("model"),
    year_built: getText("year_built"),
    home_port: getText("home_port"),
    description: getText("description"),
    notes: getText("notes"),
    is_active: Boolean(active?.checked),
  };
};

const hasSnapshotChanges = (left: BoatFormSnapshot, right: BoatFormSnapshot) =>
  left.name !== right.name ||
  left.model !== right.model ||
  left.year_built !== right.year_built ||
  left.home_port !== right.home_port ||
  left.description !== right.description ||
  left.notes !== right.notes ||
  left.is_active !== right.is_active;

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
  const [activeEditorId, setActiveEditorId] = useState<string | null>(null);
  const [dirtyEditors, setDirtyEditors] = useState<Record<string, boolean>>({});
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
  const visibleEditorIds = useMemo(() => {
    const ids: string[] = [];
    if (isCreating) {
      ids.push("new");
    }

    if (useCompactSelector) {
      if (selectedBoat?.id) {
        ids.push(selectedBoat.id);
      }
      return ids;
    }

    filteredBoats.forEach((boat) => ids.push(boat.id));
    return ids;
  }, [filteredBoats, isCreating, selectedBoat?.id, useCompactSelector]);

  useEffect(() => {
    if (!visibleEditorIds.length) {
      setActiveEditorId(null);
      return;
    }

    if (!activeEditorId || !visibleEditorIds.includes(activeEditorId)) {
      setActiveEditorId(visibleEditorIds[0]);
    }
  }, [activeEditorId, visibleEditorIds]);

  const hasActiveDirty = activeEditorId ? Boolean(dirtyEditors[activeEditorId]) : false;
  const activeFormId = activeEditorId ? `boat-editor-form-${activeEditorId}` : null;
  const activeEditorLabel = useMemo(() => {
    if (!activeEditorId) {
      return "";
    }

    if (activeEditorId === "new") {
      return locale === "es" ? "Añadir barco" : "Add boat";
    }

    const byId = boats.find((boat) => boat.id === activeEditorId);
    return byId?.name ?? activeEditorId;
  }, [activeEditorId, boats, locale]);

  const handleDirtyChange = useCallback((editorId: string, isDirty: boolean) => {
    setDirtyEditors((prev) => {
      if (isDirty && prev[editorId]) {
        return prev;
      }

      if (!isDirty && !prev[editorId]) {
        return prev;
      }

      const next = { ...prev };
      if (isDirty) {
        next[editorId] = true;
      } else {
        delete next[editorId];
      }
      return next;
    });
  }, []);

  const text =
    locale === "es"
      ? {
          eyebrow: "Administración de barcos",
          manage: "Gestionar barcos",
          createActionTitle: "Crear barco",
          createActionBody: "Alta manual de un nuevo barco. Esta accion queda separada de la busqueda para reducir errores de contexto.",
          addBoat: "Añadir barco",
          pendingChangesTitle: "Cambios pendientes",
          pendingChangesBody: "{boat} tiene cambios sin guardar.",
          pendingChangesSwitchConfirm:
            "Tienes cambios sin guardar en esta ficha. ¿Quieres descartarlos para cambiar de barco?",
          pendingChangesLeaveConfirm:
            "Tienes cambios sin guardar en esta ficha. ¿Quieres descartarlos y salir de este panel?",
          saveChanges: "Guardar cambios",
          discardChanges: "Descartar",
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
          createActionTitle: "Create boat",
          createActionBody: "Manual creation for a new boat. This action is separated from search to reduce context mistakes.",
          addBoat: "Add boat",
          pendingChangesTitle: "Pending changes",
          pendingChangesBody: "{boat} has unsaved changes.",
          pendingChangesSwitchConfirm:
            "You have unsaved changes in this card. Discard them and switch boats?",
          pendingChangesLeaveConfirm:
            "You have unsaved changes in this card. Discard them and leave this panel?",
          saveChanges: "Save changes",
          discardChanges: "Discard",
          search: "Search boat",
          searchHelp:
            "Search by boat name, owner or owner email to open a single card.",
          noMatches: "No boats match the current search.",
          noBoatSelected:
            "Type to search a boat by name, owner or owner email and open a single card to manage it.",
        };

  const discardEditorDraft = useCallback((editorId: string) => {
    const form = document.getElementById(`boat-editor-form-${editorId}`);
    if (form instanceof HTMLFormElement) {
      form.reset();
    }

    handleDirtyChange(editorId, false);
  }, [handleDirtyChange]);

  const requestEditorSwitch = (nextEditorId: string, applySwitch: () => void) => {
    if (!activeEditorId || activeEditorId === nextEditorId || !dirtyEditors[activeEditorId]) {
      applySwitch();
      return;
    }

    if (!confirm(text.pendingChangesSwitchConfirm)) {
      return;
    }

    discardEditorDraft(activeEditorId);
    applySwitch();
  };

  useEffect(() => {
    if (!activeEditorId || !dirtyEditors[activeEditorId]) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) {
        return;
      }

      if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
        return;
      }

      const currentUrl = new URL(window.location.href);
      const nextUrl = new URL(anchor.href, window.location.href);
      if (
        currentUrl.pathname === nextUrl.pathname &&
        currentUrl.search === nextUrl.search &&
        currentUrl.hash === nextUrl.hash
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (!confirm(text.pendingChangesLeaveConfirm)) {
        return;
      }

      discardEditorDraft(activeEditorId);
      window.location.href = anchor.href;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [activeEditorId, dirtyEditors, discardEditorDraft, text.pendingChangesLeaveConfirm]);

  return (
    <section className="admin-stack">
      <article className="dashboard-card admin-card admin-boats-actions">
        <div>
          <p className="eyebrow">{text.createActionTitle}</p>
          <p className="muted">{text.createActionBody}</p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            const nextEditorId = isCreating ? selectedBoat?.id ?? "new" : "new";
            requestEditorSwitch(nextEditorId, () => {
              setIsCreating((value) => !value);
            });
          }}
          type="button"
        >
          + {text.addBoat}
        </button>
      </article>

      <article className="dashboard-card admin-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">{text.eyebrow}</p>
            <h2>{useCompactSelector ? text.manage : text.search}</h2>
            {useCompactSelector ? <p className="muted">{text.searchHelp}</p> : null}
          </div>
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
                        requestEditorSwitch(boat.id, () => {
                          setSelectedBoatId(boat.id);
                          setSearch("");
                        });
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
          editorId="new"
          isActiveEditor={activeEditorId === "new"}
          onCreated={() => {
            setIsCreating(false);
            setSearch("");
          }}
          onDirtyChange={handleDirtyChange}
          onSetActiveEditor={setActiveEditorId}
          onDelete={onDelete}
          onSave={onSave}
          title={text.addBoat}
        />
      ) : null}

      {useCompactSelector ? (
        selectedBoat ? (
          <BoatEditorCard
            boat={selectedBoat}
            editorId={selectedBoat.id}
            isActiveEditor={activeEditorId === selectedBoat.id}
            key={selectedBoat.id}
            onDirtyChange={handleDirtyChange}
            onSetActiveEditor={setActiveEditorId}
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
            editorId={boat.id}
            isActiveEditor={activeEditorId === boat.id}
            key={boat.id}
            onDirtyChange={handleDirtyChange}
            onSetActiveEditor={setActiveEditorId}
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

      {activeEditorId && hasActiveDirty && activeFormId ? (
        <div className="admin-changes-bar" role="status">
          <div>
            <p className="eyebrow">{text.pendingChangesTitle}</p>
            <p className="muted">
              {text.pendingChangesBody.replace("{boat}", activeEditorLabel)}
            </p>
          </div>
          <div className="inline-actions">
            <button className="primary-button" form={activeFormId} type="submit">
              {text.saveChanges}
            </button>
            <button className="secondary-button" form={activeFormId} type="reset">
              {text.discardChanges}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function BoatEditorCard({
  boat,
  editorId,
  isActiveEditor,
  title,
  onCreated,
  onDirtyChange,
  onSetActiveEditor,
  onSave,
  onUploadImage,
  onRemoveImage,
  onDelete,
}: {
  boat: BoatEditorValue;
  editorId: string;
  isActiveEditor: boolean;
  title: string;
  onCreated?: () => void;
  onDirtyChange: (editorId: string, isDirty: boolean) => void;
  onSetActiveEditor: (editorId: string) => void;
  onSave: (fd: FormData) => Promise<void | { id: string }>;
  onUploadImage?: (fd: FormData) => Promise<void>;
  onRemoveImage?: (fd: FormData) => Promise<void>;
  onDelete: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const { locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const formId = `boat-editor-form-${editorId}`;
  const initialSnapshot = useMemo(
    () => buildBoatFormSnapshot(boat),
    [
      boat.id,
      boat.name,
      boat.model,
      boat.year_built,
      boat.home_port,
      boat.description,
      boat.notes,
      boat.is_active,
    ],
  );
  const [isDirty, setIsDirty] = useState(false);

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

  useEffect(() => {
    setIsDirty(false);
    onDirtyChange(editorId, false);
  }, [editorId, initialSnapshot, onDirtyChange]);

  const updateDirtyState = () => {
    if (!formRef.current) {
      return;
    }

    const currentSnapshot = readBoatFormSnapshot(formRef.current);
    const nextDirty = hasSnapshotChanges(currentSnapshot, initialSnapshot);
    setIsDirty(nextDirty);
    onDirtyChange(editorId, nextDirty);
  };

  const resetDirtyState = () => {
    setIsDirty(false);
    onDirtyChange(editorId, false);
  };

  const saveBoat = (formData: FormData) => {
    startTransition(() => {
      void onSave(formData)
        .then((result) => {
          toast.success(text.saved);
          if (!boat.id && result && "id" in result && result.id) {
            router.prefetch(`/boats/${result.id}/trip`);
            onCreated?.();
          } else {
            resetDirtyState();
          }
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : text.saveError);
        });
    });
  };

  const uploadImage = () => {
    if (!boat.id || !imageFile || !onUploadImage) {
      return;
    }

    const formData = new FormData();
    formData.set("boat_id", boat.id);
    formData.set("image", imageFile);

    startTransition(() => {
      void onUploadImage(formData)
        .then(() => {
          toast.success(text.imageUpdated);
          setImageFile(null);
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : text.imageUpdateError);
        });
    });
  };

  const removeImage = () => {
    if (!boat.id || !onRemoveImage) {
      return;
    }

    const formData = new FormData();
    formData.set("boat_id", boat.id);

    startTransition(() => {
      void onRemoveImage(formData)
        .then(() => {
          toast.success(text.imageRemoved);
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : text.imageRemoveError);
        });
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

    startTransition(() => {
      void onDelete(formData)
        .then(() => {
          toast.success(text.deleted);
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : text.deleteError);
        });
    });
  };

  return (
    <article
      className={`dashboard-card admin-card admin-card--boat-editor${isActiveEditor ? " is-active-editor" : ""}`}
      onFocusCapture={() => onSetActiveEditor(editorId)}
    >
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
          onChange={updateDirtyState}
          onInput={updateDirtyState}
          onReset={() => {
            setTimeout(() => {
              resetDirtyState();
            }, 0);
          }}
          onSubmit={(event) => {
            event.preventDefault();
            saveBoat(new FormData(event.currentTarget));
          }}
          id={formId}
          ref={formRef}
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
