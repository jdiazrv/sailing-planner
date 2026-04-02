"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n/provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { PlaceAutocompleteField } from "@/components/places/place-autocomplete-field";
import { formatShortDate, nauticalMilesBetweenPoints } from "@/lib/planning";
import type { TripSegmentView } from "@/lib/planning";

type Props = {
  segments: TripSegmentView[];
  boatId: string;
  seasonId: string;
  seasonStart: string;
  canEdit: boolean;
  onSave: (fd: FormData) => Promise<void>;
  onDelete: (fd: FormData) => Promise<void>;
};

export function TripSegmentsManager({
  segments,
  boatId,
  seasonId,
  seasonStart,
  canEdit,
  onSave,
  onDelete,
}: Props) {
  const { t } = useI18n();
  const [addOpen, setAddOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<TripSegmentView | null>(null);
  const [segmentToDelete, setSegmentToDelete] = useState<TripSegmentView | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = (formData: FormData) => {
    const isEdit = Boolean(formData.get("segment_id"));
    setFormError(null);
    startTransition(async () => {
      try {
        await onSave(formData);
        toast.success(
          isEdit ? t("planning.segmentUpdated") : t("planning.segmentAdded"),
        );
        setAddOpen(false);
        setEditingSegment(null);
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
    startTransition(async () => {
      try {
        await onDelete(fd);
        toast.success(t("planning.segmentDeleted"));
        setSegmentToDelete(null);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t("planning.deleteSegmentError"),
        );
      }
    });
  };

  const statusLabel = (value: string) => t(`status.${value}` as never);
  const locationTypeLabel = (value: string) => t(`planning.${value}` as never);

  return (
    <>
      {canEdit && segments.length > 0 && (
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
            + {t("planning.addSegment")}
          </button>
        </div>
      )}

      {segments.length ? (
        <div className="data-sheet">
          <div className="data-sheet__header data-sheet__header--trip">
            <span>#</span>
            <span>{t("planning.dates")}</span>
            <span title="Millas nauticas">Millas nauticas</span>
            <span>{t("planning.location")}</span>
            <span>{t("planning.status")}</span>
            <span>{t("planning.notes")}</span>
            {canEdit && <span></span>}
          </div>
          {segments.map((segment, index) => {
            const previousSegment = index > 0 ? segments[index - 1] : null;
            const distanceFromPrevious = previousSegment
              ? nauticalMilesBetweenPoints(
                  previousSegment.latitude,
                  previousSegment.longitude,
                  segment.latitude,
                  segment.longitude,
                )
              : null;

            return (
              <div className="data-row data-row--trip" key={segment.id}>
                <div>
                  <span className="status-pill is-good">{index + 1}</span>
                </div>
                <div className="table-stack">
                  <span>{formatShortDate(segment.start_date)}</span>
                  <span className="muted">{formatShortDate(segment.end_date)}</span>
                </div>
                <div className="table-stack">
                  <span>{distanceFromPrevious == null ? "" : `${Math.round(distanceFromPrevious)} nm`}</span>
                </div>
                <div className="table-stack">
                  <span>{segment.location_label}</span>
                  <span className="muted">{locationTypeLabel(segment.location_type)}</span>
                </div>
                <div>
                  <span className={`status-pill is-${segment.status}`}>
                    {statusLabel(segment.status)}
                  </span>
                </div>
                <div className="cell-clamp muted">{segment.public_notes}</div>
                {canEdit && (
                  <div className="table-actions">
                    <button
                      aria-label={t("common.edit")}
                      className="icon-button"
                      disabled={isPending}
                      onClick={() => setEditingSegment(segment)}
                      title={t("common.edit")}
                      type="button"
                    >
                      <span aria-hidden="true">✎</span>
                    </button>
                    <button
                      aria-label={t("common.delete")}
                      className="icon-button icon-button--danger"
                      disabled={isPending}
                      onClick={() => setSegmentToDelete(segment)}
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
        <div className="empty-state">
          <p className="muted">{t("planning.noTripSegments")}</p>
          {canEdit ? (
            <button
              className="primary-button"
              disabled={isPending}
              onClick={() => setAddOpen(true)}
              type="button"
            >
              + {t("planning.addSegment")}
            </button>
          ) : null}
        </div>
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
  segment,
  onSubmit,
  isPending,
}: {
  boatId: string;
  errorMessage?: string | null;
  seasonId: string;
  seasonStart: string;
  segment?: TripSegmentView;
  onSubmit: (fd: FormData) => void;
  isPending: boolean;
}) {
  const { t } = useI18n();
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
            defaultValue={segment?.start_date ?? seasonStart}
            name="start_date"
            required
            type="date"
          />
        </label>
        <label>
          <span>{t("planning.endDate")}</span>
          <input
            defaultValue={segment?.end_date ?? seasonStart}
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
