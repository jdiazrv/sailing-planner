"use client";
/* eslint-disable @next/next/no-img-element */

import { type ReactNode, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n/provider";
import { BoatPlaceholder } from "@/components/ui/boat-placeholder";
import { Dialog } from "@/components/ui/dialog";
import type { BoatDetails } from "@/lib/planning";

type BoatSettingsDialogProps = {
  boat: BoatDetails;
  onSave: (fd: FormData) => Promise<void>;
  onUploadImage: (fd: FormData) => Promise<void>;
  onRemoveImage: (fd: FormData) => Promise<void>;
  triggerLabel?: string;
  triggerClassName?: string;
  triggerIcon?: ReactNode;
};

export function BoatSettingsDialog({
  boat,
  onSave,
  onUploadImage,
  onRemoveImage,
  triggerLabel,
  triggerClassName,
  triggerIcon,
}: BoatSettingsDialogProps) {
  const router = useRouter();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [imageFile, setImageFile] = useState<File | null>(null);

  const text =
    locale === "es"
      ? {
          open: "Configurar barco",
          title: "Configuración del barco",
          subtitle:
            "Actualiza los datos visibles del barco. El nombre y las notas internas siguen reservados a superusuarios.",
          image: "Imagen del barco",
          upload: "Subir imagen",
          remove: "Quitar imagen",
          noImage: "Sin imagen",
          model: "Modelo",
          yearBuilt: "Año de construcción",
          homePort: "Puerto base",
          description: "Descripción",
          save: "Guardar cambios",
          saving: "Guardando...",
          saved: "Barco actualizado",
          saveError: "No se pudo guardar el barco",
          imageUpdated: "Imagen del barco actualizada",
          imageUpdateError: "No se pudo subir la imagen",
          imageRemoved: "Imagen del barco eliminada",
          imageRemoveError: "No se pudo eliminar la imagen",
        }
      : {
          open: "Boat settings",
          title: "Boat settings",
          subtitle:
            "Update the visible boat data. Name and internal notes remain restricted to superusers.",
          image: "Boat image",
          upload: "Upload image",
          remove: "Remove image",
          noImage: "No image",
          model: "Model",
          yearBuilt: "Year built",
          homePort: "Home port",
          description: "Description",
          save: "Save changes",
          saving: "Saving...",
          saved: "Boat updated",
          saveError: "Could not save boat",
          imageUpdated: "Boat image updated",
          imageUpdateError: "Could not upload boat image",
          imageRemoved: "Boat image removed",
          imageRemoveError: "Could not remove boat image",
        };

  const handleSave = (formData: FormData) => {
    startTransition(async () => {
      try {
        await onSave(formData);
        toast.success(text.saved);
        router.refresh();
        setOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : text.saveError);
      }
    });
  };

  const uploadImage = () => {
    if (!imageFile) {
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

  return (
    <>
      <button
        className={triggerClassName ?? "secondary-button"}
        aria-label={triggerLabel ?? text.open}
        onClick={() => setOpen(true)}
        type="button"
      >
        {triggerIcon ? (
          <>
            <span className="app-sidebar__icon">{triggerIcon}</span>
            <span className="app-sidebar__label">{triggerLabel ?? text.open}</span>
          </>
        ) : (
          triggerLabel ?? text.open
        )}
      </button>

      <Dialog onClose={() => setOpen(false)} open={open} title={text.title}>
        <div className="editor-form">
          <p className="muted">{text.subtitle}</p>

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

              <div className="editor-form editor-form--dense">
                <label>
                  <span>{text.image}</span>
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
                    {text.upload}
                  </button>
                  {boat.image_path ? (
                    <button
                      className="link-button link-button--danger"
                      disabled={isPending}
                      onClick={removeImage}
                      type="button"
                    >
                      {text.remove}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <form
              className="editor-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleSave(new FormData(event.currentTarget));
              }}
            >
              <input name="boat_id" type="hidden" value={boat.id} />

              <div className="form-grid">
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
                <label className="form-grid__wide">
                  <span>{text.homePort}</span>
                  <input defaultValue={boat.home_port ?? ""} name="home_port" />
                </label>
                <label className="form-grid__wide">
                  <span>{text.description}</span>
                  <textarea defaultValue={boat.description ?? ""} name="description" rows={3} />
                </label>
              </div>

              <div className="modal__footer">
                <button className="primary-button" disabled={isPending} type="submit">
                  {isPending ? text.saving : text.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Dialog>
    </>
  );
}
