"use client";
/* eslint-disable @next/next/no-img-element */

import { type ReactNode, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n/provider";
import { BoatPlaceholder } from "@/components/ui/boat-placeholder";
import { Dialog } from "@/components/ui/dialog";
import type { BoatDetails } from "@/lib/planning";
import type { OnboardingStep } from "@/types/database";

type BoatSettingsDialogProps = {
  boatId: string;
  boat: BoatDetails;
  onboardingStep?: OnboardingStep | null;
  onSave: (fd: FormData) => Promise<void>;
  onUploadImage: (fd: FormData) => Promise<void>;
  onRemoveImage: (fd: FormData) => Promise<void>;
  triggerLabel?: string;
  triggerClassName?: string;
  triggerTitle?: string;
  triggerIcon?: ReactNode;
};

export function BoatSettingsDialog({
  boatId,
  boat,
  onboardingStep,
  onSave,
  onUploadImage,
  onRemoveImage,
  triggerLabel,
  triggerClassName,
  triggerTitle,
  triggerIcon,
}: BoatSettingsDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const skipDialogCloseRef = useRef(false);

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

  const markBoatSettingsCompleted = async () => {
    if (onboardingStep !== "configure_boat") {
      return;
    }

    await fetch("/api/onboarding/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "boat_settings_completed", boatId }),
    });
  };

  const handleDialogClose = () => {
    if (skipDialogCloseRef.current) {
      skipDialogCloseRef.current = false;
      return;
    }

    setOpen(false);

    if (onboardingStep !== "configure_boat") {
      return;
    }

    void markBoatSettingsCompleted().then(() => {
      router.refresh();
    });
  };

  const handleSave = (formData: FormData) => {
    startTransition(() => {
      try {
        void onSave(formData).then(async () => {
          await markBoatSettingsCompleted();
          toast.success(text.saved);
          skipDialogCloseRef.current = true;
          router.refresh();
          setOpen(false);
        }).catch((error) => {
          toast.error(error instanceof Error ? error.message : text.saveError);
        });
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

    startTransition(() => {
      try {
        void onUploadImage(formData).then(() => {
          toast.success(text.imageUpdated);
          setImageFile(null);
          router.refresh();
        }).catch((error) => {
          toast.error(error instanceof Error ? error.message : text.imageUpdateError);
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : text.imageUpdateError);
      }
    });
  };

  const removeImage = () => {
    const formData = new FormData();
    formData.set("boat_id", boat.id);

    startTransition(() => {
      try {
        void onRemoveImage(formData).then(() => {
          toast.success(text.imageRemoved);
          router.refresh();
        }).catch((error) => {
          toast.error(error instanceof Error ? error.message : text.imageRemoveError);
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : text.imageRemoveError);
      }
    });
  };

  useEffect(() => {
    if (searchParams.get("openBoatSettings") !== "1") {
      return;
    }

    setOpen(true);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("openBoatSettings");
    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  return (
    <>
      <button
        className={triggerClassName ?? "secondary-button"}
        aria-label={triggerLabel ?? text.open}
        title={triggerTitle ?? triggerLabel ?? text.open}
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

      <Dialog onClose={handleDialogClose} open={open} title={text.title}>
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
