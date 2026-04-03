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
  const [isExpanded, setIsExpanded] = useState(!selectedBoatId);
  const useSearchPicker = entries.length > (isMobile ? 6 : 12);
  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 680px)");
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setIsExpanded(!selectedBoatId);
    setQuery("");
  }, [selectedBoatId]);

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
  const selectedEntry = entries.find((entry) => entry.boatId === selectedBoatId) ?? null;

  const selectionSummary = selectedEntry ? (
    <article className="dashboard-card shared-selection-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">{t("shared.currentSelection")}</p>
          <h2>{selectedEntry.boatName}</h2>
          <p className="muted">
            {selectedEntry.seasonName ?? t("shared.noSeasonPublished")}
          </p>
        </div>
        <button
          className="secondary-button"
          onClick={() => setIsExpanded((value) => !value)}
          type="button"
        >
          {t("shared.changeBoat")}
        </button>
      </div>
    </article>
  ) : null;

  if (!useSearchPicker) {
    return (
      <section className="admin-stack">
        {selectionSummary}
        {(isExpanded || !selectedEntry) ? (
          <>
            <article className="dashboard-card">
              <p className="eyebrow">{t("shared.selectionTitle")}</p>
              <p className="muted">{t("shared.selectionBody")}</p>
            </article>
            <div className="shared-boat-grid">
              {entries.map((entry) => (
                <Link
                  aria-disabled={!entry.seasonId}
                  className={`boat-card ${entry.boatId === selectedBoatId ? "is-active" : ""}${!entry.seasonId ? " is-disabled" : ""}`}
                  href={
                    entry.seasonId
                      ? `/shared?boat=${entry.boatId}&season=${entry.seasonId}`
                      : "/shared"
                  }
                  key={entry.boatId}
                  onClick={(event) => {
                    if (!entry.seasonId) event.preventDefault();
                  }}
                >
                  <div className="boat-card__header">
                    <p className="eyebrow">{t("shared.boat")}</p>
                    <span className={`status-pill ${entry.seasonId ? "is-good" : "is-muted"}`}>
                      {entry.seasonId ? t("shared.select") : t("shared.noSeasonPublished")}
                    </span>
                  </div>
                  <h3>{entry.boatName}</h3>
                  <p className="muted">{entry.seasonName ?? t("shared.noSeasonPublished")}</p>
                  <p className="meta">
                    {t("shared.owner")}: {entry.ownerDisplayName ?? t("shared.ownerUnknown")}
                  </p>
                </Link>
              ))}
            </div>
          </>
        ) : null}
      </section>
    );
  }

  return (
    <section className="boat-selector-list">
      {selectionSummary}
      {(isExpanded || !selectedEntry) ? (
        <>
          <article className="dashboard-card">
            <p className="eyebrow">{t("shared.selectionTitle")}</p>
            <p className="muted">{t("shared.selectionBody")}</p>
          </article>
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
                      aria-disabled={!entry.seasonId}
                      className={`data-row boat-list-row ${entry.boatId === selectedBoatId ? "is-active" : ""}${!entry.seasonId ? " is-disabled" : ""}`}
                      href={
                        entry.seasonId
                          ? `/shared?boat=${entry.boatId}&season=${entry.seasonId}`
                          : "/shared"
                      }
                      key={entry.boatId}
                      onClick={(event) => {
                        if (!entry.seasonId) event.preventDefault();
                      }}
                    >
                      <div className="table-stack">
                        <strong>{entry.boatName}</strong>
                        <span className="muted">
                          {entry.ownerDisplayName ?? t("shared.ownerUnknown")} ·{" "}
                          {entry.homePort ?? t("boatSelector.homePortMissing")}
                        </span>
                      </div>
                      <span className={`status-pill ${entry.seasonId ? "is-good" : "is-muted"}`}>
                        {entry.seasonId ? t("shared.select") : t("shared.noSeasonPublished")}
                      </span>
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
