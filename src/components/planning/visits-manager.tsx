"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n/provider";
import { Dialog } from "@/components/ui/dialog";
import { PlaceAutocompleteField } from "@/components/places/place-autocomplete-field";
import { formatShortDate } from "@/lib/planning";
import type { VisitView } from "@/lib/planning";

type Props = {
  visits: VisitView[];
  boatId: string;
  seasonId: string;
  seasonStart: string;
  canEdit: boolean;
  onSave: (fd: FormData) => Promise<void>;
  onDelete: (fd: FormData) => Promise<void>;
  externalEditVisit?: VisitView | null;
  onExternalEditHandled?: () => void;
};

export function VisitsManager({
  visits,
  boatId,
  seasonId,
  seasonStart,
  canEdit,
  onSave,
  onDelete,
  externalEditVisit,
  onExternalEditHandled,
}: Props) {
  const { t } = useI18n();
  const [addOpen, setAddOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<VisitView | null>(null);
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
    startTransition(async () => {
      try {
        await onSave(formData);
        toast.success(isEdit ? "Visit updated" : "Visit added");
        setAddOpen(false);
        setEditingVisit(null);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not save visit";
        setFormError(message);
        toast.error(message);
      }
    });
  };

  const handleDelete = (visit: VisitView) => {
    if (!confirm(`Delete visit for "${visit.visitor_name ?? "this visitor"}"?`)) return;
    const fd = new FormData();
    fd.set("boat_id", boatId);
    fd.set("visit_id", visit.id);
    startTransition(async () => {
      try {
        await onDelete(fd);
        toast.success("Visit deleted");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete visit");
      }
    });
  };

  return (
    <>
      {canEdit && (
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
            + Add visit
          </button>
        </div>
      )}

      {visits.length ? (
        <div className="data-sheet">
          <div className="data-sheet__header data-sheet__header--visits">
            <span>Visitor</span>
            <span>Dates</span>
            <span>Embark → Disembark</span>
            <span>Status</span>
            <span>Notes</span>
            {canEdit && <span></span>}
          </div>
          {visits.map((visit) => (
            <div className="data-row data-row--visits" key={visit.id}>
              <div>{visit.visitor_name ?? <span className="muted">Private</span>}</div>
              <div className="table-stack">
                <span>{formatShortDate(visit.embark_date)}</span>
                <span className="muted">{formatShortDate(visit.disembark_date)}</span>
              </div>
              <div className="table-stack">
                <span>{visit.embark_place_label ?? <span className="muted">—</span>}</span>
                <span className="muted">{visit.disembark_place_label ?? "—"}</span>
              </div>
              <div>
                <span className={`status-pill is-${visit.status}`}>{visit.status}</span>
              </div>
              <div className="cell-clamp muted">{visit.public_notes}</div>
              {canEdit && (
                <div className="table-actions">
                  <button
                    aria-label={t("common.edit")}
                    className="icon-button"
                    disabled={isPending}
                    onClick={() => setEditingVisit(visit)}
                    title={t("common.edit")}
                    type="button"
                  >
                    <span aria-hidden="true">✎</span>
                  </button>
                  <button
                    aria-label={t("common.delete")}
                    className="icon-button icon-button--danger"
                    disabled={isPending}
                    onClick={() => handleDelete(visit)}
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
        <p className="muted">No visits match the current filters.</p>
      )}

      <Dialog
        onClose={() => {
          setFormError(null);
          setAddOpen(false);
        }}
        open={addOpen}
        title="Add visit"
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
        title="Edit visit"
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
      {visit && <input name="visit_id" type="hidden" value={visit.id} />}

      {errorMessage ? <p className="feedback feedback--error">{errorMessage}</p> : null}

      <div className="form-grid">
        <label className="form-grid__wide">
          <span>Visitor name</span>
          <input
            defaultValue={visit?.visitor_name ?? ""}
            name="visitor_name"
            placeholder="Julia and Salvador"
            required
          />
        </label>
        <label>
          <span>Embark date</span>
          <input
            defaultValue={visit?.embark_date ?? seasonStart}
            name="embark_date"
            required
            type="date"
          />
        </label>
        <label>
          <span>Disembark date</span>
          <input
            defaultValue={visit?.disembark_date ?? seasonStart}
            name="disembark_date"
            required
            type="date"
          />
        </label>
        <label>
          <span>Embark place</span>
          <PlaceAutocompleteField
            defaultLabel={visit?.embark_place_label}
            defaultLatitude={visit?.embark_latitude}
            defaultLongitude={visit?.embark_longitude}
            externalIdName="embark_external_place_id"
            labelName="embark_place_label"
            latitudeName="embark_latitude"
            longitudeName="embark_longitude"
            placeholder="Embark place"
            sourceName="embark_place_source"
          />
        </label>
        <label>
          <span>Disembark place</span>
          <PlaceAutocompleteField
            defaultLabel={visit?.disembark_place_label}
            defaultLatitude={visit?.disembark_latitude}
            defaultLongitude={visit?.disembark_longitude}
            externalIdName="disembark_external_place_id"
            labelName="disembark_place_label"
            latitudeName="disembark_latitude"
            longitudeName="disembark_longitude"
            placeholder="Disembark place"
            sourceName="disembark_place_source"
          />
        </label>
        <label>
          <span>Status</span>
          <select defaultValue={visit?.status ?? "tentative"} name="status">
            <option value="tentative">Tentative</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="form-grid__wide">
          <span>Public notes</span>
          <textarea
            defaultValue={visit?.public_notes ?? ""}
            name="public_notes"
            rows={2}
          />
        </label>
        <label className="form-grid__wide">
          <span>Private notes</span>
          <textarea
            defaultValue={visit?.private_notes ?? ""}
            name="private_notes"
            rows={2}
          />
        </label>
      </div>

      <div className="modal__footer">
        <button className="primary-button" disabled={isPending} type="submit">
          {isPending ? "Saving…" : visit ? "Save changes" : "Add visit"}
        </button>
      </div>
    </form>
  );
}
