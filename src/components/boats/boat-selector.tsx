/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useI18n } from "@/components/i18n/provider";
import type { BoatSummary } from "@/lib/planning";

type BoatSelectorProps = {
  boats: BoatSummary[];
  activeBoatId?: string;
};

export const BoatSelector = ({ boats, activeBoatId }: BoatSelectorProps) => {
  const { locale, t } = useI18n();
  const [query, setQuery] = useState("");
  const useCompactList = boats.length > 8;
  const filteredBoats = useMemo(
    () =>
      boats.filter((boat) =>
        [boat.boat_name, boat.home_port, boat.description]
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
            <span>{locale === "es" ? "Buscar barco" : "Search boat"}</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder={locale === "es" ? "Nombre o puerto base" : "Name or home port"}
              value={query}
            />
          </label>
        </div>
        <div className="data-sheet">
          {filteredBoats.map((boat) => (
            <Link
              className={`data-row boat-list-row ${boat.boat_id === activeBoatId ? "is-active" : ""}`}
              href={`/boats/${boat.boat_id}/trip`}
              key={boat.boat_id}
            >
              <div className="table-stack">
                <strong>{boat.boat_name}</strong>
                <span className="muted">
                  {boat.home_port
                    ? `${t("dashboard.homePort")}: ${boat.home_port}`
                    : t("boatSelector.homePortMissing")}
                </span>
              </div>
              <div className="table-actions">
                <span className={`status-pill ${boat.is_active ? "is-good" : "is-muted"}`}>
                  {boat.is_active ? t("common.active") : t("common.inactive")}
                </span>
                {boat.boat_id === activeBoatId ? (
                  <span className="status-pill is-good">{t("boatSelector.currentBoat")}</span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
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
            <div className="boat-card__image boat-card__image--empty">
              {t("boatSelector.noImage")}
            </div>
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
          <p className="muted">
            {boat.boat_id === activeBoatId
              ? t("boatSelector.currentWorkspace")
              : t("boatSelector.selectBoat")}
          </p>
          <p className="meta">
            {boat.home_port
              ? `${t("boatSelector.homePortSet")}: ${boat.home_port}`
              : t("boatSelector.homePortMissing")}
          </p>
        </Link>
      ))}
    </div>
  );
};
