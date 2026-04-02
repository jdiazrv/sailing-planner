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
}: {
  isPublic: boolean;
  isSuperuser?: boolean;
  compact?: boolean;
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
          <p className="eyebrow">{t("dashboard.sharedTimelines")}</p>
          <h2>{isPublic ? t("shared.publicOn") : t("shared.publicOff")}</h2>
        </div>
        <span className={`status-pill ${isPublic ? "is-good" : "is-muted"}`}>
          {isPublic ? t("common.active") : t("common.inactive")}
        </span>
      </div>
      {!compact ? (
        <p className="muted">
          {isSuperuser ? t("shared.enableBodySuperuser") : t("shared.enableBody")}
        </p>
      ) : null}
      <div className="workspace-header__actions">
        <button
          className="secondary-button"
          disabled={isPending}
          onClick={handleToggle}
          type="button"
        >
          {isPublic ? t("shared.toggleOff") : t("shared.toggleOn")}
        </button>
        <Link className="secondary-button" href="/shared">
          {t("dashboard.sharedTimelines")}
        </Link>
      </div>
    </article>
  );
}
