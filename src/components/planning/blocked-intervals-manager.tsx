"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n/provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { formatShortDate, hasVisitDateRange } from "@/lib/planning";
import type { VisitView } from "@/lib/planning";
import { getDocumentLocale } from "@/lib/i18n";

type Props = {
  intervals: VisitView[];
  boatId: string;
  seasonId: string;
  seasonStart: string;
  canEdit: boolean;
  initiallyOpenAdd?: boolean;
  onSave: (fd: FormData) => Promise<void>;
  onDelete: (fd: FormData) => Promise<void>;
};

export function BlockedIntervalsManager({
  intervals,
  boatId,
  seasonId,
  seasonStart,
  canEdit,
  initiallyOpenAdd = false,
  onSave,
  onDelete,
}: Props) {
  const { t } = useI18n();
  const es = getDocumentLocale() === "es";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);
  const [editingInterval, setEditingInterval] = useState<VisitView | null>(null);
  const [intervalToDelete, setIntervalToDelete] = useState<VisitView | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!initiallyOpenAdd) {
      return;
    }

    setFormError(null);
    setAddOpen(true);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("blocked");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [initiallyOpenAdd, pathname, router, searchParams]);

  const handleSave = (formData: FormData) => {
    const isEdit = Boolean(formData.get("visit_id"));
    setFormError(null);
    startTransition(() => {
      void onSave(formData)
        .then(() => {
          toast.success(isEdit ? (es ? "Período actualizado" : "Period updated") : (es ? "Período bloqueado" : "Period blocked"));
          setAddOpen(false);
          setEditingInterval(null);
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : (es ? "Error al guardar" : "Save error");
          setFormError(message);
          toast.error(message);
        });
    });
  };

  const confirmDelete = () => {
    if (!intervalToDelete) return;
    const fd = new FormData();
    fd.set("boat_id", boatId);
    fd.set("visit_id", intervalToDelete.id);
    startTransition(() => {
      void onDelete(fd)
        .then(() => {
          toast.success(es ? "Período eliminado" : "Period deleted");
          setIntervalToDelete(null);
        })
        .catch((error: unknown) => {
          toast.error(error instanceof Error ? error.message : (es ? "Error al eliminar" : "Delete error"));
        });
    });
  };

  return (
    <>
      {canEdit && (
        <div className="panel-toolbar" style={{ paddingTop: "0.35rem" }}>
          <button
            className="secondary-button"
            disabled={isPending}
            onClick={() => {
              setFormError(null);
              setAddOpen(true);
            }}
            type="button"
          >
            + {es ? "Bloquear fechas" : "Block dates"}
          </button>
          <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
            {es
              ? "Usa este botón para crear un período bloqueado por mantenimiento, reserva interna u otra indisponibilidad."
              : "Use this button to create a blocked period for maintenance, internal hold, or any other unavailability."}
          </p>
        </div>
      )}

      {intervals.length > 0 ? (
        <div className={`data-sheet ${canEdit ? "data-sheet--visits-editable" : "data-sheet--visits-readonly"}`}>
          <div className="data-sheet__header data-sheet__header--blocked">
            <span>{es ? "Fechas" : "Dates"}</span>
            <span>{es ? "Motivo" : "Reason"}</span>
            {canEdit && <span />}
          </div>
          {intervals.map((interval) => (
            <div className="data-row data-row--blocked" key={interval.id}>
              <div className="table-stack">
                {hasVisitDateRange(interval) ? (
                  <>
                    <span>{formatShortDate(interval.embark_date)}</span>
                    <span className="muted">{formatShortDate(interval.disembark_date)}</span>
                  </>
                ) : (
                  <span className="muted">—</span>
                )}
              </div>
              <div className="cell-clamp muted">
                {interval.public_notes || <span className="muted">—</span>}
              </div>
              {canEdit && (
                <div className="table-actions">
                  <button
                    aria-label={t("common.edit")}
                    className="icon-button"
                    disabled={isPending}
                    onClick={() => {
                      setFormError(null);
                      setEditingInterval(interval);
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
                    onClick={() => setIntervalToDelete(interval)}
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
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          {es ? "Sin períodos bloqueados." : "No blocked periods."}
        </p>
      )}

      <Dialog
        onClose={() => {
          setFormError(null);
          setAddOpen(false);
        }}
        open={addOpen}
        title={es ? "Bloquear fechas" : "Block dates"}
      >
        <BlockedIntervalForm
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
          setEditingInterval(null);
        }}
        open={!!editingInterval}
        title={es ? "Editar bloqueo" : "Edit blocked period"}
      >
        {editingInterval && (
          <BlockedIntervalForm
            boatId={boatId}
            errorMessage={formError}
            interval={editingInterval}
            isPending={isPending}
            key={editingInterval.id}
            onSubmit={handleSave}
            seasonId={seasonId}
            seasonStart={seasonStart}
          />
        )}
      </Dialog>

      <ConfirmDialog
        cancelLabel={t("planning.cancelAction")}
        confirmLabel={t("common.delete")}
        description={
          intervalToDelete
            ? (es
                ? `¿Eliminar el bloqueo${hasVisitDateRange(intervalToDelete) ? ` ${formatShortDate(intervalToDelete.embark_date)} – ${formatShortDate(intervalToDelete.disembark_date)}` : ""}?`
                : `Delete blocked period${hasVisitDateRange(intervalToDelete) ? ` ${formatShortDate(intervalToDelete.embark_date)} – ${formatShortDate(intervalToDelete.disembark_date)}` : ""}?`)
            : ""
        }
        destructive
        onCancel={() => setIntervalToDelete(null)}
        onConfirm={confirmDelete}
        open={Boolean(intervalToDelete)}
        pending={isPending}
        title={es ? "Eliminar bloqueo" : "Delete blocked period"}
      />
    </>
  );
}

function BlockedIntervalForm({
  boatId,
  seasonId,
  seasonStart,
  interval,
  errorMessage,
  onSubmit,
  isPending,
}: {
  boatId: string;
  seasonId: string;
  seasonStart: string;
  interval?: VisitView;
  errorMessage?: string | null;
  onSubmit: (fd: FormData) => void;
  isPending: boolean;
}) {
  const es = getDocumentLocale() === "es";

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
      <input name="status" type="hidden" value="blocked" />
      <input name="visitor_name" type="hidden" value="" />
      {interval && <input name="visit_id" type="hidden" value={interval.id} />}

      {errorMessage ? <p className="feedback feedback--error">{errorMessage}</p> : null}

      <div className="form-grid">
        <label>
          <span>{es ? "Fecha inicio" : "Start date"}</span>
          <input
            defaultValue={interval?.embark_date ?? seasonStart}
            name="embark_date"
            required
            type="date"
          />
        </label>
        <label>
          <span>{es ? "Fecha fin" : "End date"}</span>
          <input
            defaultValue={interval?.disembark_date ?? seasonStart}
            name="disembark_date"
            required
            type="date"
          />
        </label>
        <label className="form-grid__wide">
          <span>{es ? "Motivo (opcional)" : "Reason (optional)"}</span>
          <input
            defaultValue={interval?.public_notes ?? ""}
            name="public_notes"
            placeholder={es ? "Mantenimiento, reservado, etc." : "Maintenance, reserved, etc."}
          />
        </label>
      </div>

      <div className="modal__footer">
        <button className="primary-button" disabled={isPending} type="submit">
          {isPending
            ? (es ? "Guardando…" : "Saving…")
            : interval
              ? (es ? "Guardar cambios" : "Save changes")
              : (es ? "Bloquear fechas" : "Block dates")}
        </button>
      </div>
    </form>
  );
}
