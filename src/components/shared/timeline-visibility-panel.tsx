"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { updateTimelineVisibility } from "@/app/actions";
import { useI18n } from "@/components/i18n/provider";

export function TimelineVisibilityPanel({
  isPublic,
  isSuperuser = false,
  compact = false,
  titleKey,
  actionLabelKey,
  bodyKey,
  statusOnKey,
  statusOffKey,
  toggleOnKey,
  toggleOffKey,
}: {
  isPublic: boolean;
  isSuperuser?: boolean;
  compact?: boolean;
  titleKey?: "dashboard.sharedTimelines" | "dashboard.sharedTimelinesTitle";
  actionLabelKey?: "dashboard.sharedTimelines" | "dashboard.sharedTimelinesAction";
  bodyKey?:
    | "dashboard.sharedTimelinesBody"
    | "dashboard.crossBoatVisibilityBody";
  statusOnKey?:
    | "shared.visibilityOn"
    | "dashboard.crossBoatVisibilityOn";
  statusOffKey?:
    | "shared.visibilityOff"
    | "dashboard.crossBoatVisibilityOff";
  toggleOnKey?:
    | "shared.toggleOn"
    | "dashboard.crossBoatVisibilityToggleOn";
  toggleOffKey?:
    | "shared.toggleOff"
    | "dashboard.crossBoatVisibilityToggleOff";
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      try {
        await updateTimelineVisibility(!isPublic);
        toast.success(t("shared.visibilitySaved"));
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("auth.error"));
      }
    });
  };

  return (
    <article className={`dashboard-card${compact ? "" : " admin-card"}`}>
      <div className="card-header">
        <div>
          <p className="eyebrow">{t(titleKey ?? "dashboard.sharedTimelines")}</p>
          <h2>{isPublic ? t(statusOnKey ?? "shared.visibilityOn") : t(statusOffKey ?? "shared.visibilityOff")}</h2>
        </div>
        <span className={`status-pill ${isPublic ? "is-good" : "is-muted"}`}>
          {isPublic ? t("common.active") : t("common.inactive")}
        </span>
      </div>
      {!compact ? (
        <p className="muted">
          {bodyKey
            ? t(bodyKey)
            : isSuperuser
              ? t("shared.enableBodySuperuser")
              : t("shared.enableBody")}
        </p>
      ) : null}
      <div className="workspace-header__actions">
        <button
          className="secondary-button"
          disabled={isPending}
          onClick={handleToggle}
          type="button"
        >
          {isPublic ? t(toggleOffKey ?? "shared.toggleOff") : t(toggleOnKey ?? "shared.toggleOn")}
        </button>
        <Link className="secondary-button" href="/shared">
          {t(actionLabelKey ?? "dashboard.sharedTimelines")}
        </Link>
      </div>
    </article>
  );
}
