"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/i18n/provider";

type SharedBoatPickerEntry = {
  boatId: string;
  boatName: string;
  homePort: string | null;
  seasonId: string | null;
  seasonName: string | null;
  ownerDisplayName: string | null;
  isActive: boolean;
};

export function SharedBoatPicker({
  entries,
  selectedBoatId,
}: {
  entries: SharedBoatPickerEntry[];
  selectedBoatId: string | null;
}) {
  const { locale, t } = useI18n();
  const [query, setQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const useSearchPicker = entries.length > (isMobile ? 6 : 12);
  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 680px)");
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) =>
        [entry.boatName, entry.ownerDisplayName, entry.homePort]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [entries, query],
  );

  if (!useSearchPicker) {
    return (
      <div className="shared-boat-grid">
        {entries.map((entry) => (
          <Link
            className={`boat-card ${entry.boatId === selectedBoatId ? "is-active" : ""}`}
            href={
              entry.seasonId
                ? `/shared?boat=${entry.boatId}&season=${entry.seasonId}`
                : `/shared?boat=${entry.boatId}`
            }
            key={entry.boatId}
          >
            <div className="boat-card__header">
              <p className="eyebrow">{t("shared.boat")}</p>
              <span className="status-pill is-good">{t("shared.open")}</span>
            </div>
            <h3>{entry.boatName}</h3>
            <p className="muted">{entry.seasonName ?? t("planning.noSeasonSelected")}</p>
            <p className="meta">
              {t("shared.owner")}: {entry.ownerDisplayName ?? "—"}
            </p>
          </Link>
        ))}
      </div>
    );
  }

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
        ? filteredEntries.length ? (
            <div className="boat-combobox__menu" role="listbox">
              {filteredEntries.map((entry) => (
                <Link
                  className={`data-row boat-list-row ${entry.boatId === selectedBoatId ? "is-active" : ""}`}
                  href={
                    entry.seasonId
                      ? `/shared?boat=${entry.boatId}&season=${entry.seasonId}`
                      : `/shared?boat=${entry.boatId}`
                  }
                  key={entry.boatId}
                >
                  <div className="table-stack">
                    <strong>{entry.boatName}</strong>
                    <span className="muted">
                      {entry.ownerDisplayName ?? "—"} ·{" "}
                      {entry.homePort ?? t("boatSelector.homePortMissing")}
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
