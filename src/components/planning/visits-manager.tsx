"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n/provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { PlaceAutocompleteField } from "@/components/places/place-autocomplete-field";
import { GuidedEmptyState } from "@/components/planning/guided-empty-state";
import {
  formatShortDate,
  hasVisitDateRange,
  type VisitPanelDisplayMode,
} from "@/lib/planning";
import type { VisitView } from "@/lib/planning";

const VISIT_IMAGE_MAX_WIDTH = 150;
const VISIT_IMAGE_MAX_HEIGHT = 200;

const loadImageFromFile = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load selected image."));
    };

    image.src = objectUrl;
  });

const resizeVisitImageForPreview = async (file: File) => {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const image = await loadImageFromFile(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const ratio = Math.min(
    1,
    VISIT_IMAGE_MAX_WIDTH / width,
    VISIT_IMAGE_MAX_HEIGHT / height,
  );

  if (ratio >= 1) {
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));

  const context = canvas.getContext("2d");
  if (!context) {
    return file;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const outputType = file.type === "image/png" ? "image/png" : "image/webp";
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outputType, 0.9);
  });

  if (!blob) {
    return file;
  }

  const extension = outputType === "image/png" ? "png" : "webp";
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.${extension}`, {
    type: outputType,
    lastModified: Date.now(),
  });
};

type Props = {
  visits: VisitView[];
  boatId: string;
  seasonId: string;
  seasonStart: string;
  visitPanelDisplayMode?: VisitPanelDisplayMode;
  canEdit: boolean;
  selectedVisitId?: string | null;
  onSelectVisit?: (visit: VisitView) => void;
  onSave: (fd: FormData) => Promise<void>;
  onDelete: (fd: FormData) => Promise<void>;
  externalEditVisit?: VisitView | null;
  onExternalEditHandled?: () => void;
  emptyMessage?: string;
};

export function VisitsManager({
  visits,
  boatId,
  seasonId,
  seasonStart,
  visitPanelDisplayMode = "both",
  canEdit,
  selectedVisitId = null,
  onSelectVisit,
  onSave,
  onDelete,
  externalEditVisit,
  onExternalEditHandled,
  emptyMessage,
}: Props) {
  const { t } = useI18n();
  const [addOpen, setAddOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<VisitView | null>(null);
  const [visitToDelete, setVisitToDelete] = useState<VisitView | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Open edit dialog when triggered from outside (e.g. timeline click)
  useEffect(() => {
    if (externalEditVisit) {
      setEditingVisit(externalEditVisit);
      onExternalEditHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalEditVisit?.id]);

  const handleSave = (formData: FormData) => {
    const isEdit = Boolean(formData.get("visit_id"));
    setFormError(null);
    startTransition(() => {
      try {
        void onSave(formData).then(() => {
          toast.success(isEdit ? t("planning.visitUpdated") : t("planning.visitAdded"));
          setAddOpen(false);
          setEditingVisit(null);
        }).catch((error) => {
          const message =
            error instanceof Error ? error.message : t("planning.saveVisitError");
          setFormError(message);
          toast.error(message);
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t("planning.saveVisitError");
        setFormError(message);
        toast.error(message);
      }
    });
  };

  const confirmDelete = () => {
    if (!visitToDelete) {
      return;
    }
    const fd = new FormData();
    fd.set("boat_id", boatId);
    fd.set("visit_id", visitToDelete.id);
    startTransition(() => {
      try {
        void onDelete(fd).then(() => {
          toast.success(t("planning.visitDeleted"));
          setVisitToDelete(null);
        }).catch((error) => {
          toast.error(error instanceof Error ? error.message : t("planning.deleteVisitError"));
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("planning.deleteVisitError"));
      }
    });
  };

  const visitRowLabels = {
    visitor: t("planning.visitor"),
    dates: t("planning.dates"),
    embarkDisembark: t("planning.embarkDisembark"),
    status: t("planning.status"),
    notes: t("planning.notes"),
  };

  const renderVisitIdentity = (visit: VisitView) => {
    const label = visit.visitor_name ?? t("planning.visit");
    const badge = visit.image_url ? (
      <span className="visit-badge visit-badge--small" aria-hidden="true">
        <img alt="" src={visit.image_url} />
      </span>
    ) : visit.badge_emoji ? (
      <span className="visit-badge visit-badge--small" aria-hidden="true">
        <span>{visit.badge_emoji}</span>
      </span>
    ) : null;

    if (visitPanelDisplayMode === "image") {
      return badge ?? <span>{label}</span>;
    }

    if (visitPanelDisplayMode === "both" && badge) {
      return (
        <span className="visit-row__identity">
          {badge}
          <span>{label}</span>
        </span>
      );
    }

    return <span>{label}</span>;
  };

  return (
    <>
      {canEdit && visits.length > 0 && (
        <div className="panel-toolbar">
          <button
            className="primary-button"
            disabled={isPending}
            onClick={() => {
              setFormError(null);
              setAddOpen(true);
            }}
            type="button"
          >
            + {t("planning.addVisit")}
          </button>
        </div>
      )}

      {visits.length ? (
        <div className={`data-sheet ${canEdit ? "data-sheet--visits-editable" : "data-sheet--visits-readonly"}`}>
          <div className="data-sheet__header data-sheet__header--visits">
            <span>{t("planning.visitor")}</span>
            <span>{t("planning.dates")}</span>
            <span>{t("planning.embarkDisembark")}</span>
            <span>{t("planning.status")}</span>
            <span>{t("planning.notes")}</span>
            {canEdit && <span></span>}
          </div>
          {visits.map((visit) => (
            <div
              className={`data-row data-row--visits${selectedVisitId === visit.id ? " is-selected" : ""}`}
              key={visit.id}
              onClick={() => onSelectVisit?.(visit)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectVisit?.(visit);
                }
              }}
            >
              <div data-label={visitRowLabels.visitor}>{renderVisitIdentity(visit)}</div>
              <div className="table-stack" data-label={visitRowLabels.dates}>
                {hasVisitDateRange(visit) ? (
                  <>
                    <span>{formatShortDate(visit.embark_date)}</span>
                    <span className="muted">{formatShortDate(visit.disembark_date)}</span>
                  </>
                ) : (
                  <span className="muted">—</span>
                )}
              </div>
              <div className="table-stack" data-label={visitRowLabels.embarkDisembark}>
                <span>{visit.embark_place_label ?? <span className="muted">—</span>}</span>
                <span className="muted">{visit.disembark_place_label ?? "—"}</span>
              </div>
              <div data-label={visitRowLabels.status}>
                <span className={`status-pill is-${visit.status}`}>{t(`status.${visit.status}` as never)}</span>
              </div>
              <div className="cell-clamp muted" data-label={visitRowLabels.notes}>{visit.public_notes}</div>
              {canEdit && (
                <div className="table-actions" data-label="">
                  <button
                  aria-label={t("common.edit")}
                  className="icon-button"
                  disabled={isPending}
                  onClick={(event) => {
                    event.stopPropagation();
                    setEditingVisit(visit);
                  }}
                  title={t("common.edit")}
                  type="button"
                >
                    <span aria-hidden="true">✎</span>
                  </button>
                    <button
                      aria-label={t("common.delete")}
                      className="icon-button icon-button--danger"
                      disabled={isPending}
                      onClick={(event) => {
                        event.stopPropagation();
                        setVisitToDelete(visit);
                      }}
                      title={t("common.delete")}
                      type="button"
                    >
                    <span aria-hidden="true">🗑</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <GuidedEmptyState
          icon="👥"
          title={canEdit ? "Aún no hay visitas registradas" : "No hay visitas en esta temporada"}
          body={
            canEdit
              ? "Las visitas registran a los tripulantes o invitados de la temporada: nombre, fechas de embarque y desembarque, y lugar. Cada visita aparece como una fila propia en el timeline, agrupada con otras del mismo nombre."
              : emptyMessage ?? t("planning.noVisitsEmpty")
          }
          action={
            canEdit
              ? { label: `+ ${t("planning.addVisit")}`, onClick: () => setAddOpen(true) }
              : undefined
          }
        />
      )}

      <Dialog
        onClose={() => {
          setFormError(null);
          setAddOpen(false);
        }}
        open={addOpen}
        title={t("planning.addVisit")}
      >
        <VisitForm
          boatId={boatId}
          errorMessage={formError}
          isPending={isPending}
          key="add"
          onSubmit={handleSave}
          seasonId={seasonId}
          seasonStart={seasonStart}
        />
      </Dialog>

      <Dialog
        onClose={() => {
          setFormError(null);
          setEditingVisit(null);
        }}
        open={!!editingVisit}
        title={t("planning.editVisit")}
      >
        {editingVisit && (
          <VisitForm
            boatId={boatId}
            errorMessage={formError}
            isPending={isPending}
            key={editingVisit.id}
            onSubmit={handleSave}
            seasonId={seasonId}
            seasonStart={seasonStart}
            visit={editingVisit}
          />
        )}
      </Dialog>

      <ConfirmDialog
        cancelLabel={t("planning.cancelAction")}
        confirmLabel={t("common.delete")}
        description={
          visitToDelete
            ? t("planning.deleteVisitConfirm").replace(
                "{name}",
                visitToDelete.visitor_name ?? t("planning.visit"),
              )
            : ""
        }
        destructive
        onCancel={() => setVisitToDelete(null)}
        onConfirm={confirmDelete}
        open={Boolean(visitToDelete)}
        pending={isPending}
        title={t("planning.confirmDeleteTitle")}
      />
    </>
  );
}

function VisitForm({
  boatId,
  errorMessage,
  seasonId,
  seasonStart,
  visit,
  onSubmit,
  isPending,
}: {
  boatId: string;
  errorMessage?: string | null;
  seasonId: string;
  seasonStart: string;
  visit?: VisitView;
  onSubmit: (fd: FormData) => void;
  isPending: boolean;
}) {
  const { t, locale } = useI18n();
  const visualText =
    locale === "es"
      ? {
          visualBadge: "Imagen o emoji",
          visualHelp: "Puedes usar un emoji o subir una imagen vertical, por ejemplo 150x200.",
          visualNone: "Nada",
          visualEmoji: "Emoji",
          visualImage: "Imagen",
          emojiLabel: "Emoji",
          emojiPlaceholder: "🌊",
          imageLabel: "Imagen",
          imageHelp: "Se guardará en Storage y se reducirá visualmente dentro del panel.",
          removeImage: "Quitar imagen",
          currentImage: "Imagen actual",
          chooseEmoji: "Elige rápido",
        }
      : {
          visualBadge: "Image or emoji",
          visualHelp: "You can use an emoji or upload a vertical image, for example 150x200.",
          visualNone: "None",
          visualEmoji: "Emoji",
          visualImage: "Image",
          emojiLabel: "Emoji",
          emojiPlaceholder: "🌊",
          imageLabel: "Image",
          imageHelp: "It will be stored in Storage and visually scaled down inside the panel.",
          removeImage: "Remove image",
          currentImage: "Current image",
          chooseEmoji: "Quick pick",
        };
  const initialVisualMode = visit?.image_path
    ? "image"
    : visit?.badge_emoji
      ? "emoji"
      : "none";
  const [visualMode, setVisualMode] = useState<"none" | "emoji" | "image">(initialVisualMode);
  const [badgeEmoji, setBadgeEmoji] = useState(visit?.badge_emoji ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [clearImage, setClearImage] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setLocalPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setLocalPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  const currentImageUrl = clearImage ? null : localPreviewUrl ?? visit?.image_url ?? null;
  const presetEmojis = ["🌊", "⛵", "🧭", "🐬", "☀️", "🏝️"];

  return (
    <form
      className="editor-form"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        if (imageFile) {
          formData.set("image", imageFile);
        } else if (clearImage || visualMode !== "image") {
          formData.delete("image");
        }
        onSubmit(formData);
      }}
    >
      <input name="boat_id" type="hidden" value={boatId} />
      <input name="season_id" type="hidden" value={seasonId} />
      {visit && <input name="visit_id" type="hidden" value={visit.id} />}
      <input name="visit_visual_mode" type="hidden" value={visualMode} />
      <input name="badge_emoji" type="hidden" value={badgeEmoji} />
      <input name="clear_image" type="hidden" value={clearImage ? "1" : "0"} />

      {errorMessage ? <p className="feedback feedback--error">{errorMessage}</p> : null}

      <div className="form-grid">
        <label className="form-grid__wide">
          <span>{t("planning.visitorName")}</span>
          <input
            defaultValue={visit?.visitor_name ?? ""}
            name="visitor_name"
            placeholder="Julia and Salvador"
            required
          />
        </label>
        <label>
          <span>{t("planning.embarkDate")}</span>
          <input
            defaultValue={visit?.embark_date ?? seasonStart}
            name="embark_date"
            required
            type="date"
          />
        </label>
        <label>
          <span>{t("planning.disembarkDate")}</span>
          <input
            defaultValue={visit?.disembark_date ?? seasonStart}
            name="disembark_date"
            required
            type="date"
          />
        </label>
        <label>
          <span>{t("planning.embarkPlace")}</span>
          <PlaceAutocompleteField
            defaultLabel={visit?.embark_place_label}
            defaultLatitude={visit?.embark_latitude}
            defaultLongitude={visit?.embark_longitude}
            externalIdName="embark_external_place_id"
            labelName="embark_place_label"
            latitudeName="embark_latitude"
            longitudeName="embark_longitude"
            placeholder={t("planning.embarkPlace")}
            sourceName="embark_place_source"
          />
        </label>
        <label>
          <span>{t("planning.disembarkPlace")}</span>
          <PlaceAutocompleteField
            defaultLabel={visit?.disembark_place_label}
            defaultLatitude={visit?.disembark_latitude}
            defaultLongitude={visit?.disembark_longitude}
            externalIdName="disembark_external_place_id"
            labelName="disembark_place_label"
            latitudeName="disembark_latitude"
            longitudeName="disembark_longitude"
            placeholder={t("planning.disembarkPlace")}
            sourceName="disembark_place_source"
          />
        </label>
        <label>
          <span>{t("planning.status")}</span>
          <select defaultValue={visit?.status ?? "tentative"} name="status">
            <option value="tentative">{t("status.tentative")}</option>
            <option value="confirmed">{t("status.confirmed")}</option>
            <option value="cancelled">{t("status.cancelled")}</option>
          </select>
        </label>
        <label className="form-grid__wide">
          <span>{visualText.visualBadge}</span>
          <select
            onChange={(event) => setVisualMode(event.target.value as "none" | "emoji" | "image")}
            value={visualMode}
          >
            <option value="none">{visualText.visualNone}</option>
            <option value="emoji">{visualText.visualEmoji}</option>
            <option value="image">{visualText.visualImage}</option>
          </select>
          <small className="muted">{visualText.visualHelp}</small>
        </label>
        {visualMode === "emoji" ? (
          <div className="form-grid__wide visit-visual-editor">
            <label>
              <span>{visualText.emojiLabel}</span>
              <input
                maxLength={4}
                onChange={(event) => setBadgeEmoji(event.target.value)}
                placeholder={visualText.emojiPlaceholder}
                value={badgeEmoji}
              />
            </label>
            <div className="visit-emoji-preset-group">
              <span>{visualText.chooseEmoji}</span>
              <div className="visit-emoji-presets">
                {presetEmojis.map((emoji) => (
                  <button
                    className={badgeEmoji === emoji ? "is-active" : undefined}
                    key={emoji}
                    onClick={() => setBadgeEmoji(emoji)}
                    type="button"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {visualMode === "image" ? (
          <div className="form-grid__wide visit-visual-editor">
            <label>
              <span>{visualText.imageLabel}</span>
              <input
                accept="image/*"
                name="image"
                onChange={async (event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  if (!nextFile) {
                    setImageFile(null);
                    return;
                  }

                  const resizedFile = await resizeVisitImageForPreview(nextFile);
                  setImageFile(resizedFile);
                  setClearImage(false);
                }}
                type="file"
              />
              <small className="muted">{visualText.imageHelp}</small>
            </label>
            {currentImageUrl ? (
              <div className="visit-image-preview-card">
                <span>{visualText.currentImage}</span>
                <img alt={visit?.visitor_name ?? t("planning.visit")} src={currentImageUrl} />
                <button
                  className="link-button link-button--danger"
                  onClick={() => {
                    setClearImage(true);
                    setImageFile(null);
                  }}
                  type="button"
                >
                  {visualText.removeImage}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        <label className="form-grid__wide">
          <span>{t("planning.publicNotes")}</span>
          <textarea
            defaultValue={visit?.public_notes ?? ""}
            name="public_notes"
            rows={2}
          />
        </label>
        <label className="form-grid__wide">
          <span>{t("planning.privateNotes")}</span>
          <textarea
            defaultValue={visit?.private_notes ?? ""}
            name="private_notes"
            rows={2}
          />
        </label>
      </div>

      <div className="modal__footer">
        <button className="primary-button" disabled={isPending} type="submit">
          {isPending ? t("planning.saving") : visit ? t("planning.saveChanges") : t("planning.addVisit")}
        </button>
      </div>
    </form>
  );
}
