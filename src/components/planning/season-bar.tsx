"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Dialog } from "@/components/ui/dialog";
import { formatLongDate } from "@/lib/planning";
import type { Database } from "@/types/database";

type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];

type Props = {
  seasons: SeasonRow[];
  selected: SeasonRow | null;
  basePath: string; // e.g. "/boats/abc/trip" or "/boats/abc/visits"
  boatId: string;
  canEdit: boolean;
  onSave: (fd: FormData) => Promise<void>;
  onDelete: (fd: FormData) => Promise<void>;
};

export function SeasonBar({
  seasons,
  selected,
  basePath,
  boatId,
  canEdit,
  onSave,
  onDelete,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSave = (formData: FormData) => {
    const isEdit = Boolean(formData.get("season_id"));
    startTransition(async () => {
      try {
        await onSave(formData);
        toast.success(isEdit ? "Season updated" : "Season created");
        setAddOpen(false);
        setEditOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save season");
      }
    });
  };

  const handleDelete = () => {
    if (!selected) return;
    if (!confirm(`Delete "${selected.name}"? This will also delete all its trip segments and visits.`)) return;
    const fd = new FormData();
    fd.set("boat_id", boatId);
    fd.set("season_id", selected.id);
    startTransition(async () => {
      try {
        await onDelete(fd);
        toast.success("Season deleted");
        setEditOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete season");
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
          <span className="muted">No season — create one to start planning</span>
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
              Change ▾
            </button>
            {showPicker && (
              <div className="season-picker-dropdown">
                {seasons.map((season) => (
                  <a
                    className={`season-picker-item${season.id === selected?.id ? " is-active" : ""}`}
                    href={`${basePath}?season=${season.id}`}
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
            Edit season
          </button>
        )}
        {canEdit && (
          <button
            className="link-button"
            disabled={isPending}
            onClick={() => setAddOpen(true)}
            type="button"
          >
            + New season
          </button>
        )}
      </div>

      <Dialog onClose={() => setAddOpen(false)} open={addOpen} title="New season">
        <SeasonForm
          boatId={boatId}
          isPending={isPending}
          key="add"
          onSubmit={handleSave}
        />
      </Dialog>

      <Dialog onClose={() => setEditOpen(false)} open={editOpen} title="Edit season">
        {selected && (
          <SeasonForm
            boatId={boatId}
            isPending={isPending}
            key={selected.id}
            onDelete={handleDelete}
            onSubmit={handleSave}
            season={selected}
          />
        )}
      </Dialog>
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
          <span>Name</span>
          <input
            defaultValue={season?.name ?? `${year} Season`}
            name="name"
            required
          />
        </label>
        <label>
          <span>Year</span>
          <input
            defaultValue={season?.year ?? year}
            name="year"
            required
            type="number"
          />
        </label>
        <label>
          <span>Start date</span>
          <input
            defaultValue={season?.start_date ?? `${year}-04-01`}
            name="start_date"
            required
            type="date"
          />
        </label>
        <label>
          <span>End date</span>
          <input
            defaultValue={season?.end_date ?? `${year}-10-31`}
            name="end_date"
            required
            type="date"
          />
        </label>
        <label className="form-grid__wide">
          <span>Notes</span>
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
            Delete
          </button>
        )}
        <button className="primary-button" disabled={isPending} type="submit">
          {isPending ? "Saving…" : season ? "Save changes" : "Create season"}
        </button>
      </div>
    </form>
  );
}
