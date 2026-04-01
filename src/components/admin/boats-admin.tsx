"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { BoatDetails } from "@/lib/planning";

type BoatsAdminProps = {
  boats: BoatDetails[];
  onSave: (fd: FormData) => Promise<void>;
  onUploadImage: (fd: FormData) => Promise<void>;
  onRemoveImage: (fd: FormData) => Promise<void>;
  onDelete: (fd: FormData) => Promise<void>;
};

type BoatEditorValue = {
  id?: string;
  image_path?: string | null;
  image_url?: string | null;
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

export function BoatsAdmin({
  boats,
  onSave,
  onUploadImage,
  onRemoveImage,
  onDelete,
}: BoatsAdminProps) {
  return (
    <section className="admin-stack">
      <article className="dashboard-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Boat administration</p>
            <h2>Edit fleet</h2>
          </div>
          <span className="badge">{boats.length} boats</span>
        </div>
        <p className="muted">
          Update the core boat record, upload a cover image and keep planning
          metadata clean for every workspace.
        </p>
      </article>

      <BoatEditorCard
        boat={emptyBoatDraft}
        onDelete={onDelete}
        onSave={onSave}
        title="Add boat"
      />

      {boats.map((boat) => (
        <BoatEditorCard
          boat={boat}
          key={boat.id}
          onDelete={onDelete}
          onRemoveImage={onRemoveImage}
          onSave={onSave}
          onUploadImage={onUploadImage}
          title={boat.name}
        />
      ))}
    </section>
  );
}

function BoatEditorCard({
  boat,
  title,
  onSave,
  onUploadImage,
  onRemoveImage,
  onDelete,
}: {
  boat: BoatEditorValue;
  title: string;
  onSave: (fd: FormData) => Promise<void>;
  onUploadImage?: (fd: FormData) => Promise<void>;
  onRemoveImage?: (fd: FormData) => Promise<void>;
  onDelete: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [imageFile, setImageFile] = useState<File | null>(null);

  const saveBoat = (formData: FormData) => {
    startTransition(async () => {
      try {
        await onSave(formData);
        toast.success(boat.id ? "Boat updated" : "Boat created");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save boat");
      }
    });
  };

  const uploadImage = () => {
    if (!boat.id || !imageFile || !onUploadImage) {
      return;
    }

    const formData = new FormData();
    formData.set("boat_id", boat.id);
    formData.set("image", imageFile);

    startTransition(async () => {
      try {
        await onUploadImage(formData);
        toast.success("Boat image updated");
        setImageFile(null);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not upload boat image",
        );
      }
    });
  };

  const removeImage = () => {
    if (!boat.id || !onRemoveImage) {
      return;
    }

    const formData = new FormData();
    formData.set("boat_id", boat.id);

    startTransition(async () => {
      try {
        await onRemoveImage(formData);
        toast.success("Boat image removed");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not remove boat image",
        );
      }
    });
  };

  const deleteBoat = () => {
    if (!boat.id) {
      return;
    }
    if (!confirm(`Delete boat "${boat.name}"? This also removes its seasons, trips, visits and permissions.`)) {
      return;
    }

    const formData = new FormData();
    formData.set("boat_id", boat.id);

    startTransition(async () => {
      try {
        await onDelete(formData);
        toast.success("Boat deleted");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete boat");
      }
    });
  };

  return (
    <article className="dashboard-card admin-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">{boat.id ? "Boat" : "New boat"}</p>
          <h2>{title}</h2>
        </div>
        <span className={`status-pill ${boat.is_active ? "is-good" : "is-muted"}`}>
          {boat.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="admin-boat-grid">
        <div className="boat-image-card">
          {boat.image_url ? (
            <img
              alt={boat.name}
              className="boat-image"
              src={boat.image_url}
            />
          ) : (
            <div className="boat-image boat-image--empty">No image</div>
          )}

          {boat.id && onUploadImage ? (
            <div className="editor-form editor-form--dense">
              <label>
                <span>Boat image</span>
                <input
                  accept="image/*"
                  disabled={isPending}
                  onChange={(event) =>
                    setImageFile(event.target.files?.[0] ?? null)
                  }
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
                  Upload image
                </button>
                {boat.image_path && (
                  <button
                    className="link-button link-button--danger"
                    disabled={isPending}
                    onClick={removeImage}
                    type="button"
                  >
                    Remove image
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="muted">Save the boat first to upload its image.</p>
          )}
        </div>

        <form
          className="editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            saveBoat(new FormData(event.currentTarget));
          }}
        >
          {boat.id && <input name="boat_id" type="hidden" value={boat.id} />}

          <div className="form-grid">
            <label>
              <span>Name</span>
              <input defaultValue={boat.name} name="name" required />
            </label>
            <label>
              <span>Model</span>
              <input defaultValue={boat.model ?? ""} name="model" />
            </label>
            <label>
              <span>Year built</span>
              <input
                defaultValue={boat.year_built ?? ""}
                min={1900}
                name="year_built"
                type="number"
              />
            </label>
            <label>
              <span>Home port</span>
              <input defaultValue={boat.home_port ?? ""} name="home_port" />
            </label>
            <label className="form-grid__wide">
              <span>Description</span>
              <textarea
                defaultValue={boat.description ?? ""}
                name="description"
                rows={2}
              />
            </label>
            <label className="form-grid__wide">
              <span>Internal notes</span>
              <textarea defaultValue={boat.notes ?? ""} name="notes" rows={3} />
            </label>
            <label className="checkbox-field">
              <input
                defaultChecked={boat.is_active}
                name="is_active"
                type="checkbox"
              />
              <span>Boat active</span>
            </label>
          </div>

          <div className="modal__footer">
            <button className="primary-button" disabled={isPending} type="submit">
              {isPending ? "Saving..." : boat.id ? "Save boat" : "Create boat"}
            </button>
            {boat.id && (
              <button
                className="link-button link-button--danger"
                disabled={isPending}
                onClick={deleteBoat}
                type="button"
              >
                Delete boat
              </button>
            )}
          </div>
        </form>
      </div>
    </article>
  );
}
