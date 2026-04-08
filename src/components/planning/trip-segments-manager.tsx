"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n/provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { PlaceAutocompleteField } from "@/components/places/place-autocomplete-field";
import { GuidedEmptyState } from "@/components/planning/guided-empty-state";
import {
  addDays,
  formatShortDate,
  nauticalMilesBetweenPoints,
  sortTripSegmentsBySchedule,
} from "@/lib/planning";
import type { PortStopView } from "@/lib/planning";

type Props = {
  segments: PortStopView[];
  boatId: string;
  seasonId: string;
  seasonStart: string;
  canEdit: boolean;
  selectedSegmentId?: string | null;
  onSelectSegment?: (segment: PortStopView) => void;
  externalEditSegment?: PortStopView | null;
  onExternalEditHandled?: () => void;
  onSave: (fd: FormData) => Promise<void>;
  onDelete: (fd: FormData) => Promise<void>;
};

export function TripSegmentsManager({
  segments,
  boatId,
  seasonId,
  seasonStart,
  canEdit,
  selectedSegmentId = null,
  onSelectSegment,
  externalEditSegment,
  onExternalEditHandled,
  onSave,
  onDelete,
}: Props) {
  const { t } = useI18n();
  const [addOpen, setAddOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<PortStopView | null>(null);
  const [segmentToDelete, setSegmentToDelete] = useState<PortStopView | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const orderedSegments = sortTripSegmentsBySchedule(segments);
  const previousSegmentForNew = orderedSegments[orderedSegments.length - 1] ?? null;
  const addSegmentStartDate = previousSegmentForNew
    ? addDays(previousSegmentForNew.end_date, 1)
    : seasonStart;

  // Open edit dialog when triggered from outside (e.g. selection panel)
  useEffect(() => {
    if (externalEditSegment) {
      setEditingSegment(externalEditSegment);
      onExternalEditHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalEditSegment?.id]);

  useEffect(() => {
    if (!selectedSegmentId) {
      return;
    }

    const selectedRow = rowRefs.current.get(selectedSegmentId);
    if (!selectedRow) {
      return;
    }

    selectedRow.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [selectedSegmentId]);

  const handleSave = (formData: FormData) => {
    const isEdit = Boolean(formData.get("segment_id"));
    setFormError(null);
    startTransition(() => {
      try {
        void onSave(formData).then(() => {
          toast.success(
            isEdit ? t("planning.segmentUpdated") : t("planning.segmentAdded"),
          );
          setAddOpen(false);
          setEditingSegment(null);
        }).catch((error) => {
          const message =
            error instanceof Error ? error.message : t("planning.saveSegmentError");
          setFormError(message);
          toast.error(message);
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t("planning.saveSegmentError");
        setFormError(message);
        toast.error(message);
      }
    });
  };

  const confirmDelete = () => {
    if (!segmentToDelete) {
      return;
    }
    const fd = new FormData();
    fd.set("boat_id", boatId);
    fd.set("segment_id", segmentToDelete.id);
    startTransition(() => {
      try {
        void onDelete(fd).then(() => {
          toast.success(t("planning.segmentDeleted"));
          setSegmentToDelete(null);
        }).catch((error) => {
          toast.error(
            error instanceof Error ? error.message : t("planning.deleteSegmentError"),
          );
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t("planning.deleteSegmentError"),
        );
      }
    });
  };

  const statusLabel = (value: string) => t(`status.${value}` as never);
  const locationTypeLabel = (value: string) => t(`planning.${value}` as never);
  const tripRowLabels = {
    order: "#",
    dates: t("planning.dates"),
    distance: "Millas nauticas",
    location: t("planning.location"),
    status: t("planning.status"),
    notes: t("planning.notes"),
    actions: t("common.actions"),
  };

  return (
    <>
      {canEdit && segments.length > 0 && (
        <div className="panel-toolbar">
          <button
            className="primary-button"
            disabled={isPending}
            onClick={() => {
              setFormError(null);
              setEditingSegment(null);
              setAddOpen(true);
            }}
            type="button"
          >
            + {t("planning.addSegment")}
          </button>
        </div>
      )}

      {orderedSegments.length ? (
        <div className={`data-sheet ${canEdit ? "data-sheet--trip-editable" : "data-sheet--trip-readonly"}`}>
          <div className="data-sheet__header data-sheet__header--trip">
            <span>#</span>
            <span>{t("planning.dates")}</span>
            <span title="Millas nauticas">Millas nauticas</span>
            <span>{t("planning.location")}</span>
            <span>{t("planning.status")}</span>
            <span>{t("planning.notes")}</span>
            {canEdit && <span>{t("common.actions")}</span>}
          </div>
          {orderedSegments.map((segment, index) => {
            const previousSegment = index > 0 ? orderedSegments[index - 1] : null;
            const distanceFromPrevious = previousSegment
              ? nauticalMilesBetweenPoints(
                  previousSegment.latitude,
                  previousSegment.longitude,
                  segment.latitude,
                  segment.longitude,
                )
              : null;

            return (
              <div
                className={`data-row data-row--trip${selectedSegmentId === segment.id ? " is-selected" : ""}`}
                key={segment.id}
                ref={(node) => {
                  if (node) {
                    rowRefs.current.set(segment.id, node);
                    return;
                  }

                  rowRefs.current.delete(segment.id);
                }}
                onClick={() => onSelectSegment?.(segment)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectSegment?.(segment);
                  }
                }}
              >
                <div data-label={tripRowLabels.order}>
                  <span className="status-pill is-good">{index + 1}</span>
                </div>
                <div className="table-stack" data-label={tripRowLabels.dates}>
                  <span>{formatShortDate(segment.start_date)}</span>
                  <span className="muted">{formatShortDate(segment.end_date)}</span>
                </div>
                <div className="table-stack" data-label={tripRowLabels.distance}>
                  <span>{distanceFromPrevious == null ? "" : `${Math.round(distanceFromPrevious)} nm`}</span>
                </div>
                <div className="table-stack" data-label={tripRowLabels.location}>
                  <span>{segment.location_label}</span>
                  <span className="muted">{locationTypeLabel(segment.location_type)}</span>
                </div>
                <div data-label={tripRowLabels.status}>
                  <span className={`status-pill is-${segment.status}`}>
                    {statusLabel(segment.status)}
                  </span>
                </div>
                <div className="cell-clamp muted" data-label={tripRowLabels.notes}>{segment.public_notes}</div>
                {canEdit && (
                  <div className="table-actions" data-label={tripRowLabels.actions}>
                    <button
                      aria-label={t("common.edit")}
                      className="icon-button"
                      disabled={isPending}
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingSegment(segment);
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
                        setSegmentToDelete(segment);
                      }}
                      title={t("common.delete")}
                      type="button"
                    >
                      <span aria-hidden="true">🗑</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <GuidedEmptyState
          icon="🗺️"
          title={canEdit ? "Aún no hay escalas de viaje" : "No hay escalas planificadas"}
          body={
            canEdit
              ? "Las escalas definen las zonas de navegacion de la temporada: fechas, lugar, estado y millas. Añade la primera para que aparezca en el timeline y en el mapa."
              : "Todavia no se han añadido escalas de viaje para esta temporada."
          }
          action={
            canEdit
              ? {
                  label: `+ ${t("planning.addSegment")}`,
                  onClick: () => {
                    setFormError(null);
                    setEditingSegment(null);
                    setAddOpen(true);
                  },
                }
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
        title={t("planning.addTripSegment")}
      >
        <TripSegmentForm
          boatId={boatId}
          defaultStartDate={addSegmentStartDate}
          errorMessage={formError}
          isPending={isPending}
          key={`add-${addOpen ? addSegmentStartDate : "closed"}-${orderedSegments.length}`}
          onSubmit={handleSave}
          seasonId={seasonId}
          seasonStart={seasonStart}
        />
      </Dialog>

      <Dialog
        onClose={() => {
          setFormError(null);
          setEditingSegment(null);
        }}
        open={!!editingSegment}
        title={t("planning.editTripSegment")}
      >
        {editingSegment && (
          <TripSegmentForm
            boatId={boatId}
            errorMessage={formError}
            isPending={isPending}
            key={editingSegment.id}
            onSubmit={handleSave}
            seasonId={seasonId}
            seasonStart={seasonStart}
            segment={editingSegment}
          />
        )}
      </Dialog>

      <ConfirmDialog
        cancelLabel={t("planning.cancelAction")}
        confirmLabel={t("common.delete")}
        description={
          segmentToDelete
            ? t("planning.deleteSegmentConfirm").replace("{name}", segmentToDelete.location_label)
            : ""
        }
        destructive
        onCancel={() => setSegmentToDelete(null)}
        onConfirm={confirmDelete}
        open={Boolean(segmentToDelete)}
        pending={isPending}
        title={t("planning.confirmDeleteTitle")}
      />
    </>
  );
}

function TripSegmentForm({
  boatId,
  errorMessage,
  seasonId,
  seasonStart,
  defaultStartDate,
  segment,
  onSubmit,
  isPending,
}: {
  boatId: string;
  errorMessage?: string | null;
  seasonId: string;
  seasonStart: string;
  defaultStartDate?: string;
  segment?: PortStopView;
  onSubmit: (fd: FormData) => void;
  isPending: boolean;
}) {
  const { t } = useI18n();
  const initialStartDate = segment?.start_date ?? defaultStartDate ?? seasonStart;
  const initialEndDate = segment?.end_date ?? initialStartDate;

  return (
    <form
      className="editor-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
    >
      <input name="boat_id" type="hidden" value={boatId} />
      <input name="season_id" type="hidden" value={seasonId} />
      {segment && <input name="segment_id" type="hidden" value={segment.id} />}
      <input
        name="sort_order"
        type="hidden"
        value={segment?.sort_order ?? 0}
      />

      {errorMessage ? <p className="feedback feedback--error">{errorMessage}</p> : null}

      <div className="form-grid">
        <label>
          <span>{t("planning.startDate")}</span>
          <input
            defaultValue={initialStartDate}
            name="start_date"
            required
            type="date"
          />
        </label>
        <label>
          <span>{t("planning.endDate")}</span>
          <input
            defaultValue={initialEndDate}
            name="end_date"
            required
            type="date"
          />
        </label>
        <label className="form-grid__wide">
          <span>{t("planning.location")}</span>
          <PlaceAutocompleteField
            defaultExternalPlaceId={segment?.external_place_id}
            defaultLabel={segment?.location_label}
            defaultLatitude={segment?.latitude}
            defaultLongitude={segment?.longitude}
            externalIdName="external_place_id"
            labelName="location_label"
            latitudeName="latitude"
            longitudeName="longitude"
            placeholder="Cicladas, puerto de Paros, aeropuerto de Atenas…"
            sourceName="place_source"
          />
        </label>
        <label>
          <span>{t("planning.precision")}</span>
          <select defaultValue={segment?.location_type ?? "zone"} name="location_type">
            <option value="zone">{t("planning.zone")}</option>
            <option value="island">{t("planning.island")}</option>
            <option value="city">{t("planning.city")}</option>
            <option value="port">{t("planning.port")}</option>
            <option value="marina">{t("planning.marina")}</option>
            <option value="anchorage">{t("planning.anchorage")}</option>
            <option value="airport">{t("planning.airport")}</option>
            <option value="boatyard">{t("planning.boatyard")}</option>
            <option value="other">{t("planning.other")}</option>
          </select>
        </label>
        <label>
          <span>{t("planning.status")}</span>
          <select defaultValue={segment?.status ?? "tentative"} name="status">
            <option value="tentative">{t("status.tentative")}</option>
            <option value="planned">{t("status.planned")}</option>
            <option value="confirmed">{t("status.confirmed")}</option>
            <option value="active">{t("status.active")}</option>
            <option value="completed">{t("status.completed")}</option>
            <option value="cancelled">{t("status.cancelled")}</option>
          </select>
        </label>
        <label className="form-grid__wide">
          <span>{t("planning.publicNotes")}</span>
          <textarea
            defaultValue={segment?.public_notes ?? ""}
            name="public_notes"
            rows={2}
          />
        </label>
        <label className="form-grid__wide">
          <span>{t("planning.privateNotes")}</span>
          <textarea
            defaultValue={segment?.private_notes ?? ""}
            name="private_notes"
            rows={2}
          />
        </label>
      </div>

      <div className="modal__footer">
        <button className="primary-button" disabled={isPending} type="submit">
          {isPending
            ? t("planning.saving")
            : segment
              ? t("planning.saveChanges")
              : t("planning.addSegment")}
        </button>
      </div>
    </form>
  );
}
