"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n/provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { formatLongDate } from "@/lib/planning";
import type { Database } from "@/types/database";

type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];

type Props = {
  seasons: SeasonRow[];
  selected: SeasonRow | null;
  basePath: string;
  boatId: string;
  canEdit: boolean;
  initiallyOpenAdd?: boolean;
  onSave: (fd: FormData) => Promise<void>;
  onDelete: (fd: FormData) => Promise<void>;
};

export function SeasonBar({
  seasons,
  selected,
  basePath,
  boatId,
  canEdit,
  initiallyOpenAdd = false,
  onSave,
  onDelete,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showPicker, setShowPicker] = useState(false);
  const [addOpen, setAddOpen] = useState(initiallyOpenAdd);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { t } = useI18n();

  useEffect(() => {
    if (!initiallyOpenAdd) {
      return;
    }

    setAddOpen(true);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("setup");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [initiallyOpenAdd, pathname, router, searchParams]);

  const buildSeasonHref = (seasonId: string) =>
    `${basePath}${basePath.includes("?") ? "&" : "?"}season=${seasonId}`;

  const handleSave = (formData: FormData) => {
    const isEdit = Boolean(formData.get("season_id"));
    startTransition(() => {
      try {
        void onSave(formData).then(() => {
          toast.success(
            isEdit ? t("planning.seasonUpdated") : t("planning.seasonCreated"),
          );
          setAddOpen(false);
          setEditOpen(false);
        }).catch((error) => {
          toast.error(error instanceof Error ? error.message : t("planning.saveSeasonError"));
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("planning.saveSeasonError"));
      }
    });
  };

  const handleDelete = () => {
    if (!selected) return;
    const fd = new FormData();
    fd.set("boat_id", boatId);
    fd.set("season_id", selected.id);
    startTransition(() => {
      try {
        void onDelete(fd).then(() => {
          toast.success(t("planning.seasonDeleted"));
          setEditOpen(false);
          setConfirmDeleteOpen(false);
        }).catch((error) => {
          toast.error(error instanceof Error ? error.message : t("planning.deleteSeasonError"));
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("planning.deleteSeasonError"));
      }
    });
  };

  return (
    <div className="season-bar">
      <div className="season-bar__current">
        {selected ? (
          <>
            <strong className="season-bar__name">{selected.name}</strong>
            <span className="muted">
              {formatLongDate(selected.start_date)} –{" "}
              {formatLongDate(selected.end_date)}
            </span>
          </>
        ) : (
          <span className="muted">{t("planning.noSeasonCreateHint")}</span>
        )}
      </div>

      <div className="season-bar__actions">
        {seasons.length > 1 && (
          <div className="season-bar__picker-wrap">
            <button
              className="link-button"
              onClick={() => setShowPicker((v) => !v)}
              type="button"
            >
              {t("planning.changeSeason")} ▾
            </button>
            {showPicker && (
              <div className="season-picker-dropdown">
                {seasons.map((season) => (
                  <a
                    className={`season-picker-item${season.id === selected?.id ? " is-active" : ""}`}
                    href={buildSeasonHref(season.id)}
                    key={season.id}
                    onClick={() => setShowPicker(false)}
                  >
                    <span>{season.name}</span>
                    <span className="muted">
                      {formatLongDate(season.start_date)} –{" "}
                      {formatLongDate(season.end_date)}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        {canEdit && selected && (
          <button
            className="link-button"
            disabled={isPending}
            onClick={() => setEditOpen(true)}
            type="button"
          >
            {t("planning.editSeason")}
          </button>
        )}
        {canEdit && (
          <button
            className="link-button"
            disabled={isPending}
            onClick={() => setAddOpen(true)}
            type="button"
          >
            + {t("planning.newSeason")}
          </button>
        )}
      </div>

      <Dialog onClose={() => setAddOpen(false)} open={addOpen} title={t("planning.newSeason")}>
        <SeasonForm
          boatId={boatId}
          isPending={isPending}
          key="add"
          onSubmit={handleSave}
        />
      </Dialog>

      <Dialog onClose={() => setEditOpen(false)} open={editOpen} title={t("planning.editSeason")}>
        {selected && (
          <SeasonForm
            boatId={boatId}
            isPending={isPending}
            key={selected.id}
            onDelete={() => setConfirmDeleteOpen(true)}
            onSubmit={handleSave}
            season={selected}
          />
        )}
      </Dialog>

      <ConfirmDialog
        cancelLabel={t("planning.cancelAction")}
        confirmLabel={t("common.delete")}
        description={
          selected
            ? t("planning.deleteSeasonConfirm").replace("{name}", selected.name)
            : ""
        }
        destructive
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        open={confirmDeleteOpen}
        pending={isPending}
        title={t("planning.confirmDeleteTitle")}
      />
    </div>
  );
}

function SeasonForm({
  boatId,
  season,
  onSubmit,
  onDelete,
  isPending,
}: {
  boatId: string;
  season?: SeasonRow;
  onSubmit: (fd: FormData) => void;
  onDelete?: () => void;
  isPending: boolean;
}) {
  const year = season?.year ?? new Date().getUTCFullYear();
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
      {season && <input name="season_id" type="hidden" value={season.id} />}

      <div className="form-grid">
        <label className="form-grid__wide">
          <span>{t("planning.seasonName")}</span>
          <input
            defaultValue={season?.name ?? `${year} ${t("planning.seasonLabelSuffix")}`}
            name="name"
            required
          />
        </label>
        <label>
          <span>{t("planning.seasonYear")}</span>
          <input
            defaultValue={season?.year ?? year}
            name="year"
            required
            type="number"
          />
        </label>
        <label>
          <span>{t("planning.startDate")}</span>
          <input
            defaultValue={season?.start_date ?? `${year}-04-01`}
            name="start_date"
            required
            type="date"
          />
        </label>
        <label>
          <span>{t("planning.endDate")}</span>
          <input
            defaultValue={season?.end_date ?? `${year}-10-31`}
            name="end_date"
            required
            type="date"
          />
        </label>
        <label className="form-grid__wide">
          <span>{t("planning.notes")}</span>
          <textarea defaultValue={season?.notes ?? ""} name="notes" rows={2} />
        </label>
      </div>

      <div className="modal__footer">
        {onDelete && (
          <button
            className="link-button link-button--danger"
            disabled={isPending}
            onClick={onDelete}
            type="button"
          >
            {t("common.delete")}
          </button>
        )}
        <button className="primary-button" disabled={isPending} type="submit">
          {isPending
            ? t("planning.saving")
            : season
              ? t("planning.saveChanges")
              : t("planning.createSeason")}
        </button>
      </div>
    </form>
  );
}
