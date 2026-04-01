/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import type { BoatSummary } from "@/lib/planning";

type BoatSelectorProps = {
  boats: BoatSummary[];
  activeBoatId?: string;
};

export const BoatSelector = async ({ boats, activeBoatId }: BoatSelectorProps) => {
  const locale = await getRequestLocale();

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
              {t(locale, "boatSelector.noImage")}
            </div>
          )}
          <div className="boat-card__header">
            <p className="eyebrow">
              {boat.boat_id === activeBoatId
                ? t(locale, "boatSelector.currentBoat")
                : t(locale, "boatSelector.boat")}
            </p>
            <span className={`status-pill ${boat.is_active ? "is-good" : "is-muted"}`}>
              {boat.is_active ? t(locale, "common.active") : t(locale, "common.inactive")}
            </span>
          </div>
          <h3>{boat.boat_name}</h3>
          <p className="muted">
            {boat.boat_id === activeBoatId
              ? t(locale, "boatSelector.currentWorkspace")
              : t(locale, "boatSelector.selectBoat")}
          </p>
          <p className="meta">
            {boat.home_port
              ? `${t(locale, "boatSelector.homePortSet")}: ${boat.home_port}`
              : t(locale, "boatSelector.homePortMissing")}
          </p>
        </Link>
      ))}
    </div>
  );
};
