"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

import type {
  BoatDetails,
  PortStopView,
  SeasonRow,
  VisitView,
} from "@/lib/planning";
import {
  getVisitDisplayName,
  sortTripSegmentsBySchedule,
  sortVisitsBySchedule,
} from "@/lib/planning";
import { getIntlLocale, type Locale } from "@/lib/i18n";

type SummaryActionsProps = {
  boat: BoatDetails;
  canViewVisits: boolean;
  locale: Locale;
  season: SeasonRow;
  tripSegments: PortStopView[];
  visits: VisitView[];
};

const formatDate = (value: string | null, locale: Locale) => {
  if (!value) {
    return locale === "es" ? "TBD" : "TBD";
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
};

const sanitizeFilePart = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

export function SummaryActions({
  boat,
  canViewVisits,
  locale,
  season,
  tripSegments,
  visits,
}: SummaryActionsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);

      const doc = new jsPDF({ format: "a4", unit: "mm" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      let cursorY = 16;

      const addWrappedText = (
        text: string,
        options?: { size?: number; weight?: "normal" | "bold"; color?: [number, number, number] },
      ) => {
        const size = options?.size ?? 10;
        const weight = options?.weight ?? "normal";
        const color = options?.color ?? [32, 41, 56];

        doc.setFont("helvetica", weight);
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);

        const lines = doc.splitTextToSize(text, contentWidth);
        const estimatedHeight = lines.length * (size * 0.42) + 1.4;

        if (cursorY + estimatedHeight > pageHeight - margin) {
          doc.addPage();
          cursorY = 16;
        }

        doc.text(lines, margin, cursorY);
        cursorY += estimatedHeight;
      };

      const addDivider = () => {
        if (cursorY + 4 > pageHeight - margin) {
          doc.addPage();
          cursorY = 16;
        }
        doc.setDrawColor(208, 216, 228);
        doc.line(margin, cursorY, pageWidth - margin, cursorY);
        cursorY += 5;
      };

      const orderedSegments = sortTripSegmentsBySchedule(tripSegments);
      const visibleVisits = canViewVisits
        ? sortVisitsBySchedule(visits.filter((visit) => visit.status !== "blocked"))
        : [];

      addWrappedText(boat.name, { size: 19, weight: "bold", color: [18, 45, 74] });
      addWrappedText(season.name, { size: 12, weight: "bold", color: [37, 99, 133] });
      addWrappedText(
        locale === "es"
          ? `Ventana: ${formatDate(season.start_date, locale)} - ${formatDate(season.end_date, locale)}`
          : `Window: ${formatDate(season.start_date, locale)} - ${formatDate(season.end_date, locale)}`,
        { size: 10 },
      );

      const boatMeta = [boat.model, boat.home_port, boat.year_built ? String(boat.year_built) : null]
        .filter(Boolean)
        .join(" · ");
      if (boatMeta) {
        addWrappedText(boatMeta, { size: 10, color: [92, 104, 118] });
      }

      addDivider();
      addWrappedText(locale === "es" ? "Escalas" : "Port stops", {
        size: 13,
        weight: "bold",
        color: [18, 45, 74],
      });

      if (!orderedSegments.length) {
        addWrappedText(locale === "es" ? "Sin escalas definidas." : "No port stops defined.");
      } else {
        orderedSegments.forEach((segment, index) => {
          addWrappedText(
            `${index + 1}. ${segment.location_label} · ${formatDate(segment.start_date, locale)} - ${formatDate(segment.end_date, locale)} · ${segment.status}`,
            { size: 10, weight: "bold" },
          );
          addWrappedText(
            locale === "es"
              ? `Tipo: ${segment.location_type}${segment.public_notes ? ` · ${segment.public_notes}` : ""}`
              : `Type: ${segment.location_type}${segment.public_notes ? ` · ${segment.public_notes}` : ""}`,
            { size: 9, color: [92, 104, 118] },
          );
        });
      }

      if (canViewVisits) {
        addDivider();
        addWrappedText(locale === "es" ? "Visitas" : "Visits", {
          size: 13,
          weight: "bold",
          color: [18, 45, 74],
        });

        if (!visibleVisits.length) {
          addWrappedText(locale === "es" ? "Sin visitas visibles." : "No visible visits.");
        } else {
          visibleVisits.forEach((visit) => {
            addWrappedText(
              `${getVisitDisplayName(visit, locale === "es" ? "Visita" : "Visit")} · ${visit.status}`,
              { size: 10, weight: "bold" },
            );
            addWrappedText(
              `${formatDate(visit.embark_date, locale)} - ${formatDate(visit.disembark_date, locale)}`,
              { size: 9 },
            );
            addWrappedText(
              `${locale === "es" ? "Embarque" : "Embark"}: ${visit.embark_place_label ?? "TBD"} · ${locale === "es" ? "Desembarque" : "Disembark"}: ${visit.disembark_place_label ?? "TBD"}`,
              { size: 9, color: [92, 104, 118] },
            );
            if (visit.public_notes) {
              addWrappedText(visit.public_notes, { size: 9, color: [92, 104, 118] });
            }
          });
        }
      }

      const fileName = `${sanitizeFilePart(boat.name || "boat")}-${sanitizeFilePart(season.name || "season")}-summary.pdf`;
      doc.save(fileName, { returnPromise: true });
      toast.success(locale === "es" ? "PDF descargado" : "PDF downloaded");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : locale === "es"
            ? "No se pudo generar el PDF"
            : "Could not generate the PDF",
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="route-summary__actions">
      <button className="secondary-button" disabled={isExporting} onClick={() => void handleDownloadPdf()} type="button">
        {isExporting
          ? locale === "es"
            ? "Generando PDF..."
            : "Generating PDF..."
          : locale === "es"
            ? "Descargar PDF"
            : "Download PDF"}
      </button>
    </div>
  );
}