"use client";

import Link from "next/link";
import { useEffect } from "react";

import { useI18n } from "@/components/i18n/provider";

export default function BoatWorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error("[BoatWorkspaceError]", error);
  }, [error]);

  return (
    <div className="error-boundary">
      <div className="error-boundary__card">
        <p className="eyebrow">{t("error.boatWorkspace")}</p>
        <h1>{t("error.boatWorkspace")}</h1>
        <p className="muted">{t("error.boatWorkspaceBody")}</p>
        {error.digest ? (
          <p className="error-boundary__digest">
            {t("error.ref").replace("{digest}", error.digest)}
          </p>
        ) : null}
        <div className="error-boundary__actions">
          <button className="primary-button" onClick={reset} type="button">
            {t("common.retry")}
          </button>
          <Link className="secondary-button" href="/dashboard">
            {t("error.goBack")}
          </Link>
        </div>
      </div>
    </div>
  );
}
