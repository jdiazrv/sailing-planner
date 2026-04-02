/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/i18n/provider";
import { BoatPlaceholder } from "@/components/ui/boat-placeholder";
import type { BoatSummary } from "@/lib/planning";

type BoatSelectorProps = {
  boats: BoatSummary[];
  activeBoatId?: string;
};

export const BoatSelector = ({ boats, activeBoatId }: BoatSelectorProps) => {
  const { locale, t } = useI18n();
  const [query, setQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const useCompactList = boats.length > (isMobile ? 6 : 12);
  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 680px)");
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);
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

  if (useCompactList) {
    return (
      <section className="boat-selector-list">
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
                    href={`/boats/${boat.boat_id}/trip`}
                    key={boat.boat_id}
                  >
                    <div className="table-stack">
                      <strong>{boat.boat_name}</strong>
                      <span className="muted">
                        {boat.user_display_name ?? "—"} ·{" "}
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
      </section>
    );
  }

  return (
    <div className="boat-grid">
      {boats.map((boat) => (
        <Link
          className={`boat-card ${boat.boat_id === activeBoatId ? "is-active" : ""}`}
          href={`/boats/${boat.boat_id}/trip`}
          key={boat.boat_id}
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
            <p className="eyebrow">
              {boat.boat_id === activeBoatId
                ? t("boatSelector.currentBoat")
                : t("boatSelector.boat")}
            </p>
            <span className={`status-pill ${boat.is_active ? "is-good" : "is-muted"}`}>
              {boat.is_active ? t("common.active") : t("common.inactive")}
            </span>
          </div>
          <h3>{boat.boat_name}</h3>
          <p className="meta">{boat.home_port || t("boatSelector.homePortMissing")}</p>
          <p className="boat-card__access">
            {locale === "es" ? "Ult. acceso" : "Last access"}: {formatLastAccess(boat.user_last_access_at)}
          </p>
          <div className="boat-card__stats">
            <span>{boat.trip_segments_count ?? 0}T</span>
            <span>{boat.visits_count ?? 0}V</span>
            <span>{boat.active_invites_count ?? 0}I</span>
          </div>
        </Link>
      ))}
    </div>
  );
};
