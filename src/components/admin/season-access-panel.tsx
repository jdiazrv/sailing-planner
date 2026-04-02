"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n/provider";
import type { SeasonAccessLinkSummary } from "@/lib/planning";

type Props = {
  boatId: string;
  seasonId: string;
  activeLink: SeasonAccessLinkSummary | null;
  latestLink: SeasonAccessLinkSummary | null;
  onGenerate: (
    fd: FormData,
  ) => Promise<{ id: string; expiresAt: string; url: string } | { error: string }>;
  onRevoke: (fd: FormData) => Promise<void>;
};

export function SeasonAccessPanel({
  boatId,
  seasonId,
  activeLink,
  latestLink,
  onGenerate,
  onRevoke,
}: Props) {
  const router = useRouter();
  const { locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [showActions, setShowActions] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [canViewVisits, setCanViewVisits] = useState(true);
  const [accessWindow, setAccessWindow] = useState<"season_end" | "season_plus_7">(

    "season_end",
  );

  const text =
    locale === "es"
      ? {
          eyebrow: "Enlace de temporada",
          title: "Acceso temporal de solo lectura",
          body:
            "Genera un enlace temporal para compartir esta temporada sin crear usuarios nuevos.",
          openActions: "Gestionar enlace",
          hideActions: "Ocultar",
          status: "Estado",
          active: "Activo",
          inactive: "Inactivo",
          expiresAt: "Expira en",
          lastAccess: "Último acceso",
          accessCount: "Accesos",
          revokedAt: "Revocado",
          creator: "Creado por",
          visibility: "Visibilidad",
          tripOnly: "Solo tramos de viaje",
          tripAndVisits: "Tramos y visitas",
          includeVisits: "Incluir visitas en el enlace",
          copy: "Copiar enlace",
          copied: "Enlace copiado",
          generate: "Generar enlace",
          regenerate: "Regenerar",
          revoke: "Revocar",
          generating: "Generando...",
          revoking: "Revocando...",
          invalidated: "El enlace anterior ha quedado invalidado.",
          generated: "Enlace temporal generado.",
          revoked: "Enlace temporal revocado.",
          defaultWindow: "Hasta fin de temporada",
          plusSeven: "Fin de temporada + 7 días",
          oneTime: "El enlace completo solo se muestra una vez tras generar o regenerar.",
          notAvailable: "Todavía no hay enlace activo para esta temporada.",
          noAccess: "Sin registros",
        }
      : {
          eyebrow: "Season link",
          title: "Temporary read-only access",
          body:
            "Generate a temporary link to share this season without creating new users.",
          openActions: "Manage link",
          hideActions: "Hide",
          status: "Status",
          active: "Active",
          inactive: "Inactive",
          expiresAt: "Expires at",
          lastAccess: "Last access",
          accessCount: "Accesses",
          revokedAt: "Revoked",
          creator: "Created by",
          visibility: "Visibility",
          tripOnly: "Trip segments only",
          tripAndVisits: "Trip segments and visits",
          includeVisits: "Include visits in shared link",
          copy: "Copy link",
          copied: "Link copied",
          generate: "Generate link",
          regenerate: "Regenerate",
          revoke: "Revoke",
          generating: "Generating...",
          revoking: "Revoking...",
          invalidated: "The previous link has been invalidated.",
          generated: "Temporary link generated.",
          revoked: "Temporary link revoked.",
          defaultWindow: "Until season end",
          plusSeven: "Season end + 7 days",
          oneTime: "The full link is only shown once after generating or regenerating it.",
          notAvailable: "There is no active link for this season yet.",
          noAccess: "No records",
        };

  const handleGenerate = () => {
    const formData = new FormData();
    formData.set("boat_id", boatId);
    formData.set("season_id", seasonId);
    formData.set("access_window", accessWindow);
    formData.set("can_view_visits", canViewVisits ? "on" : "off");

    startTransition(async () => {
      try {
        const result = await onGenerate(formData);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        setGeneratedUrl(result.url);
        toast.success(activeLink ? text.invalidated : text.generated);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unexpected error");
      }
    });
  };

  const handleRevoke = () => {
    if (!activeLink) {
      return;
    }

    const formData = new FormData();
    formData.set("boat_id", boatId);
    formData.set("link_id", activeLink.id);

    startTransition(async () => {
      try {
        await onRevoke(formData);
        setGeneratedUrl(null);
        toast.success(text.revoked);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unexpected error");
      }
    });
  };

  const handleCopy = async () => {
    if (!generatedUrl) {
      return;
    }
    await navigator.clipboard.writeText(generatedUrl);
    toast.success(text.copied);
  };

  const renderDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(value))
      : text.noAccess;

  const statusLink = activeLink ?? latestLink;

  return (
    <article className="dashboard-card admin-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">{text.eyebrow}</p>
          <h2>{text.title}</h2>
          <p className="muted">{text.body}</p>
        </div>
        <div className="card-header__actions">
          <span className={`status-pill ${activeLink ? "is-good" : "is-muted"}`}>
            {activeLink ? text.active : text.inactive}
          </span>
          <button
            className="secondary-button secondary-button--small"
            onClick={() => setShowActions((v) => !v)}
            type="button"
          >
            {showActions ? text.hideActions : text.openActions}
          </button>
        </div>
      </div>

      {showActions && (
        <>
          <div className="season-access-grid">
            <div className="data-row">
              <strong>{text.status}</strong>
              <div className="muted">{activeLink ? text.active : text.inactive}</div>
            </div>
            <div className="data-row">
              <strong>{text.expiresAt}</strong>
              <div className="muted">{renderDate(statusLink?.expires_at ?? null)}</div>
            </div>
            <div className="data-row">
              <strong>{text.lastAccess}</strong>
              <div className="muted">{renderDate(statusLink?.last_access_at ?? null)}</div>
            </div>
            <div className="data-row">
              <strong>{text.accessCount}</strong>
              <div className="muted">{statusLink?.access_count ?? 0}</div>
            </div>
            <div className="data-row">
              <strong>{text.revokedAt}</strong>
              <div className="muted">{renderDate(statusLink?.revoked_at ?? null)}</div>
            </div>
            <div className="data-row">
              <strong>{text.creator}</strong>
              <div className="muted">{statusLink?.creator_name ?? text.noAccess}</div>
            </div>
            <div className="data-row">
              <strong>{text.visibility}</strong>
              <div className="muted">
                {statusLink?.can_view_visits === false ? text.tripOnly : text.tripAndVisits}
              </div>
            </div>
          </div>

          <div className="editor-form editor-form--dense">
            <label>
              <span>{text.expiresAt}</span>
              <select
                onChange={(event) =>
                  setAccessWindow(event.target.value as "season_end" | "season_plus_7")
                }
                value={accessWindow}
              >
                <option value="season_end">{text.defaultWindow}</option>
                <option value="season_plus_7">{text.plusSeven}</option>
              </select>
            </label>
            <label className="checkbox-field">
              <input
                checked={canViewVisits}
                onChange={(event) => setCanViewVisits(event.target.checked)}
                type="checkbox"
              />
              <span>{text.includeVisits}</span>
            </label>
            <p className="muted">{text.oneTime}</p>
          </div>

          {generatedUrl ? (
            <div className="editor-form editor-form--dense">
              <label className="form-grid__wide">
                <span>URL</span>
                <input readOnly value={generatedUrl} />
              </label>
              <div className="inline-actions">
                <button className="secondary-button" onClick={handleCopy} type="button">
                  {text.copy}
                </button>
              </div>
            </div>
          ) : !activeLink ? (
            <p className="muted">{text.notAvailable}</p>
          ) : null}

          <div className="inline-actions">
            <button
              className="primary-button"
              disabled={isPending}
              onClick={handleGenerate}
              type="button"
            >
              {isPending ? text.generating : activeLink ? text.regenerate : text.generate}
            </button>
            {activeLink ? (
              <button
                className="link-button link-button--danger"
                disabled={isPending}
                onClick={handleRevoke}
                type="button"
              >
                {isPending ? text.revoking : text.revoke}
              </button>
            ) : null}
          </div>
        </>
      )}
    </article>
  );
}
