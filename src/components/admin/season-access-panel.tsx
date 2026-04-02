"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n/provider";
import type { SeasonAccessLinkSummary } from "@/lib/planning";

type Props = {
  boatId: string;
  seasonId: string;
  links: SeasonAccessLinkSummary[];
  onGenerate: (
    fd: FormData,
  ) => Promise<
    { id: string; expiresAt: string; inviteeName?: string | null; url: string } | { error: string }
  >;
  onRevoke: (fd: FormData) => Promise<void>;
};

type GeneratedLinkState = {
  id: string;
  inviteeName: string | null;
  expiresAt: string;
  url: string;
} | null;

export function SeasonAccessPanel({
  boatId,
  seasonId,
  links,
  onGenerate,
  onRevoke,
}: Props) {
  const router = useRouter();
  const { locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [showActions, setShowActions] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<GeneratedLinkState>(null);
  const [canViewVisits, setCanViewVisits] = useState(true);
  const [inviteeName, setInviteeName] = useState("");
  const [accessWindow, setAccessWindow] = useState<
    "one_use" | "one_day" | "one_week" | "season_end" | "season_plus_7"
  >("season_end");

  const text =
    locale === "es"
      ? {
          eyebrow: "Enlaces de temporada",
          title: "Acceso temporal para invitados",
          body:
            "Genera varios enlaces de solo lectura para compartir esta temporada con distintos invitados sin crear usuarios nuevos.",
          openActions: "Gestionar enlaces",
          hideActions: "Ocultar",
          generate: "Generar enlace",
          generating: "Generando...",
          revoke: "Revocar",
          revoking: "Revocando...",
          generated: "Enlace temporal generado.",
          revoked: "Enlace temporal revocado.",
          copy: "Copiar enlace",
          copied: "Enlace copiado",
          urlLabel: "URL del enlace",
          invitee: "Invitado",
          inviteePlaceholder: "Ana, Pedro, Familia Ruiz...",
          status: "Estado",
          active: "Activo",
          inactive: "Inactivo",
          expiresAt: "Expira en",
          createdAt: "Creado",
          lastAccess: "Último acceso",
          accessCount: "Accesos",
          creator: "Creado por",
          visibility: "Visibilidad",
          tripOnly: "Solo tramos",
          tripAndVisits: "Tramos y visitas",
          includeVisits: "Permitir ver visitas",
          visibilityHint:
            "Si activas las visitas, la persona invitada también verá fechas y lugares de embarque y desembarque.",
          oneTime: "El enlace completo solo se muestra una vez, justo después de generarlo.",
          empty: "Todavía no has generado enlaces para esta temporada.",
          noAccess: "Sin registros",
          latest: "Enlace recién generado",
          linksTitle: "Enlaces generados",
          activeCount: "activos",
          totalCount: "totales",
          defaultWindow: "Hasta fin de temporada",
          plusSeven: "Fin de temporada + 7 días",
          oneUse: "Un uso",
          oneDay: "Un día",
          oneWeek: "Una semana",
        }
      : {
          eyebrow: "Season links",
          title: "Temporary guest access",
          body:
            "Generate multiple read-only links for different guests without creating new users.",
          openActions: "Manage links",
          hideActions: "Hide",
          generate: "Generate link",
          generating: "Generating...",
          revoke: "Revoke",
          revoking: "Revoking...",
          generated: "Temporary link generated.",
          revoked: "Temporary link revoked.",
          copy: "Copy link",
          copied: "Link copied",
          urlLabel: "Link URL",
          invitee: "Guest",
          inviteePlaceholder: "Ana, Pedro, Ruiz family...",
          status: "Status",
          active: "Active",
          inactive: "Inactive",
          expiresAt: "Expires at",
          createdAt: "Created",
          lastAccess: "Last access",
          accessCount: "Accesses",
          creator: "Created by",
          visibility: "Visibility",
          tripOnly: "Trip segments only",
          tripAndVisits: "Trip segments and visits",
          includeVisits: "Allow visits",
          visibilityHint:
            "If enabled, guests will also see embarkation and disembarkation dates and places.",
          oneTime: "The full link is shown only once, right after generating it.",
          empty: "No links have been generated for this season yet.",
          noAccess: "No records",
          latest: "Latest generated link",
          linksTitle: "Generated links",
          activeCount: "active",
          totalCount: "total",
          defaultWindow: "Until season end",
          plusSeven: "Season end + 7 days",
          oneUse: "One use",
          oneDay: "One day",
          oneWeek: "One week",
        };

  const activeLinks = useMemo(() => links.filter((link) => link.is_active), [links]);

  const handleGenerate = () => {
    const formData = new FormData();
    formData.set("boat_id", boatId);
    formData.set("season_id", seasonId);
    formData.set("access_window", accessWindow);
    formData.set("can_view_visits", canViewVisits ? "on" : "off");
    if (inviteeName.trim()) {
      formData.set("invitee_name", inviteeName.trim());
    }

    startTransition(async () => {
      try {
        const result = await onGenerate(formData);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        setGeneratedLink({
          id: result.id,
          inviteeName: result.inviteeName ?? (inviteeName.trim() || null),
          expiresAt: result.expiresAt,
          url: result.url,
        });
        setInviteeName("");
        toast.success(text.generated);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unexpected error");
      }
    });
  };

  const handleRevoke = (linkId: string) => {
    const formData = new FormData();
    formData.set("boat_id", boatId);
    formData.set("link_id", linkId);

    startTransition(async () => {
      try {
        await onRevoke(formData);
        if (generatedLink?.id === linkId) {
          setGeneratedLink(null);
        }
        toast.success(text.revoked);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unexpected error");
      }
    });
  };

  const handleCopy = async () => {
    if (!generatedLink?.url) {
      return;
    }
    await navigator.clipboard.writeText(generatedLink.url);
    toast.success(text.copied);
  };

  const renderDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(locale, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(value))
      : text.noAccess;

  return (
    <article className="dashboard-card admin-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">{text.eyebrow}</p>
          <h2>{text.title}</h2>
          <p className="muted">{text.body}</p>
        </div>
        <div className="card-header__actions">
          <div className="season-access-summary">
            <span className={`status-pill ${activeLinks.length ? "is-good" : "is-muted"}`}>
              {activeLinks.length} {text.activeCount}
            </span>
            <span className="status-pill is-muted">
              {links.length} {text.totalCount}
            </span>
          </div>
          <button
            className="secondary-button secondary-button--small"
            onClick={() => setShowActions((v) => !v)}
            type="button"
          >
            {showActions ? text.hideActions : text.openActions}
          </button>
        </div>
      </div>

      {showActions ? (
        <>
          <div className="editor-form editor-form--dense season-access-form">
            <label className="form-grid__wide">
              <span>{text.invitee}</span>
              <input
                onChange={(event) => setInviteeName(event.target.value)}
                placeholder={text.inviteePlaceholder}
                value={inviteeName}
              />
            </label>
            <label>
              <span>{text.expiresAt}</span>
              <select
                onChange={(event) =>
                  setAccessWindow(
                    event.target.value as
                      | "one_use"
                      | "one_day"
                      | "one_week"
                      | "season_end"
                      | "season_plus_7",
                  )
                }
                value={accessWindow}
              >
                <option value="one_use">{text.oneUse}</option>
                <option value="one_day">{text.oneDay}</option>
                <option value="one_week">{text.oneWeek}</option>
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
            <p className="muted season-access-note">{text.visibilityHint}</p>
            <p className="muted">{text.oneTime}</p>
          </div>

          {generatedLink ? (
            <div className="editor-form editor-form--dense season-access-url">
              <div className="season-access-generated-head">
                <strong>{text.latest}</strong>
                {generatedLink.inviteeName ? (
                  <span className="status-pill is-good">{generatedLink.inviteeName}</span>
                ) : null}
              </div>
              <label className="form-grid__wide">
                <span>{text.urlLabel}</span>
                <input className="code-input" readOnly value={generatedLink.url} />
              </label>
              <div className="inline-actions">
                <button className="secondary-button" onClick={handleCopy} type="button">
                  {text.copy}
                </button>
                <span className="muted">{renderDate(generatedLink.expiresAt)}</span>
              </div>
            </div>
          ) : null}

          <div className="inline-actions">
            <button
              className="primary-button"
              disabled={isPending}
              onClick={handleGenerate}
              type="button"
            >
              {isPending ? text.generating : text.generate}
            </button>
          </div>

          <div className="season-access-links">
            <div className="season-access-links__header">
              <h3>{text.linksTitle}</h3>
            </div>

            {links.length ? (
              <div className="season-access-list">
                {links.map((link) => (
                  <div className="season-access-item" key={link.id}>
                    <div className="season-access-item__main">
                      <div className="season-access-item__top">
                        <strong>{link.invitee_name || text.noAccess}</strong>
                        <span className={`status-pill ${link.is_active ? "is-good" : "is-muted"}`}>
                          {link.is_active ? text.active : text.inactive}
                        </span>
                      </div>
                      <div className="season-access-meta">
                        <span>
                          {text.visibility}:{" "}
                          {link.can_view_visits === false ? text.tripOnly : text.tripAndVisits}
                        </span>
                        <span>
                          {text.createdAt}: {renderDate(link.created_at)}
                        </span>
                        <span>
                          {text.expiresAt}: {renderDate(link.expires_at)}
                        </span>
                        <span>
                          {text.lastAccess}: {renderDate(link.last_access_at)}
                        </span>
                        <span>
                          {text.accessCount}: {link.access_count}
                        </span>
                        <span>
                          {text.creator}: {link.creator_name ?? text.noAccess}
                        </span>
                      </div>
                    </div>
                    <div className="season-access-item__actions">
                      {link.is_active ? (
                        <button
                          className="secondary-button secondary-button--danger"
                          disabled={isPending}
                          onClick={() => handleRevoke(link.id)}
                          type="button"
                        >
                          {isPending ? text.revoking : text.revoke}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">{text.empty}</p>
            )}
          </div>
        </>
      ) : null}
    </article>
  );
}
