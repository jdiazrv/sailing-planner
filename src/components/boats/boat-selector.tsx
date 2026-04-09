/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/i18n/provider";
import { BoatPlaceholder } from "@/components/ui/boat-placeholder";
import type { BoatSummary } from "@/lib/planning";

type BoatSelectorProps = {
  boats: BoatSummary[];
  activeBoatId?: string;
  collapsible?: boolean;
  initiallyExpanded?: boolean;
  selectionOnly?: boolean;
  selectionSubtitle?: string | null;
};

export const BoatSelector = ({
  boats,
  activeBoatId,
  collapsible = false,
  initiallyExpanded = false,
  selectionOnly = false,
  selectionSubtitle = null,
}: BoatSelectorProps) => {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(
    initiallyExpanded || !(collapsible && activeBoatId),
  );
  const useCompactList = boats.length > 10;
  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    setIsExpanded(initiallyExpanded || !(collapsible && activeBoatId));
    setQuery("");
  }, [activeBoatId, collapsible, initiallyExpanded]);

  const formatLastAccess = (value: string | null | undefined) => {
    if (!value) {
      return locale === "es" ? "Sin acceso" : "No access";
    }

    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  };
  const filteredBoats = useMemo(
    () =>
      boats.filter((boat) =>
        [boat.boat_name, boat.home_port, boat.description, boat.user_display_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [boats, query],
  );
  const selectedBoat = boats.find((boat) => boat.boat_id === activeBoatId) ?? null;
  const hasAggregateStats = (boat: BoatSummary) =>
    boat.port_stops_count != null ||
    boat.visits_count != null ||
    boat.active_invites_count != null;
  const hasLastAccess = (boat: BoatSummary) => boat.user_last_access_at != null;
  const getBoatHref = (targetBoatId: string) => {
    if (selectionOnly) {
      return `/dashboard?boat=${targetBoatId}`;
    }

    const nextParams = new URLSearchParams(searchParams.toString());

    if (pathname.includes("/share")) {
      const suffix = nextParams.toString();
      return suffix
        ? `/boats/${targetBoatId}/share?${suffix}`
        : `/boats/${targetBoatId}/share`;
    }

    if (pathname.includes("/summary")) {
      const suffix = nextParams.toString();
      return suffix
        ? `/boats/${targetBoatId}/summary?${suffix}`
        : `/boats/${targetBoatId}/summary`;
    }

    const currentView = nextParams.get("view");
    if (currentView !== "trip" && currentView !== "visits") {
      nextParams.set("view", "trip");
    }

    const suffix = nextParams.toString();
    return suffix
      ? `/boats/${targetBoatId}?${suffix}`
      : `/boats/${targetBoatId}`;
  };

  const selectionSummary =
    collapsible && selectedBoat ? (
      <article className="dashboard-card shared-selection-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">{t("boatSelector.selectionTitle")}</p>
            <h2>{selectedBoat.boat_name}</h2>
            <p className="muted">
              {selectionSubtitle ?? selectedBoat.home_port ?? t("boatSelector.homePortMissing")}
            </p>
          </div>
          <div className="workspace-header__actions">
            {selectionOnly ? (
              <Link className="secondary-button" href={`/boats/${selectedBoat.boat_id}/trip`} prefetch={false}>
                {t("boatSelector.openWorkspace")}
              </Link>
            ) : null}
            <button
              className="secondary-button"
              onClick={() => setIsExpanded((value) => !value)}
              type="button"
            >
              {t("boatSelector.changeBoat")}
            </button>
          </div>
        </div>
      </article>
    ) : null;

  if (useCompactList) {
    return (
      <section className="boat-selector-list">
        {selectionSummary}
        {(!collapsible || isExpanded || !selectedBoat) ? (
          <>
            <div className="form-grid">
              <label className="form-grid__wide">
                <span>{t("admin.users.searchBoat")}</span>
                <input
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={
                    locale === "es"
                      ? "Nombre del barco o del usuario"
                      : "Boat name or user name"
                  }
                  value={query}
                />
              </label>
            </div>
            {hasQuery
              ? filteredBoats.length ? (
                  <div className="boat-combobox__menu" role="listbox">
                    {filteredBoats.map((boat) => (
                      <Link
                        className={`data-row boat-list-row ${boat.boat_id === activeBoatId ? "is-active" : ""}`}
                        href={getBoatHref(boat.boat_id)}
                        key={boat.boat_id}
                        prefetch={false}
                      >
                        <div className="table-stack">
                          <strong>{boat.boat_name}</strong>
                          <span className="muted">
                            {boat.user_display_name ?? t("boatSelector.ownerMissing")} ·{" "}
                            {boat.home_port || t("boatSelector.homePortMissing")}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="muted">{t("admin.users.noBoatMatches")}</p>
                )
              : null}
          </>
        ) : null}
      </section>
    );
  }

  return (
    <section className="admin-stack">
      {selectionSummary}
      {(!collapsible || isExpanded || !selectedBoat) ? (
        <div className="boat-grid">
          {boats.map((boat) => (
            <Link
              className={`boat-card ${boat.boat_id === activeBoatId ? "is-active" : ""}`}
              href={getBoatHref(boat.boat_id)}
              key={boat.boat_id}
              prefetch={false}
            >
              {boat.image_url ? (
                <img
                  alt={boat.boat_name}
                  className="boat-card__image"
                  src={boat.image_url}
                />
              ) : (
                <BoatPlaceholder
                  className="boat-card__image boat-card__image--empty"
                  title={t("boatSelector.noImage")}
                />
              )}
              <div className="boat-card__header">
                {boat.boat_id === activeBoatId ? (
                  <p className="eyebrow">{t("boatSelector.currentBoat")}</p>
                ) : (
                  <span />
                )}
                <span className={`status-pill ${boat.is_active ? "is-good" : "is-muted"}`}>
                  {boat.is_active ? t("common.active") : t("common.inactive")}
                </span>
              </div>
              <h3>{boat.boat_name}</h3>
              {boat.user_display_name ? <p className="muted">{boat.user_display_name}</p> : null}
              <p className="meta">{boat.home_port || t("boatSelector.homePortMissing")}</p>
              {hasLastAccess(boat) ? (
                <p className="boat-card__access">
                  {locale === "es" ? "Ult. acceso" : "Last access"}: {formatLastAccess(boat.user_last_access_at)}
                </p>
              ) : null}
              {hasAggregateStats(boat) ? (
                <div className="boat-card__stats">
                  <span>{boat.port_stops_count ?? 0} {t("boatSelector.tripSegmentsStat")}</span>
                  <span>{boat.visits_count ?? 0} {t("boatSelector.visitsStat")}</span>
                  <span>{boat.active_invites_count ?? 0} {t("boatSelector.invitesStat")}</span>
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
};
