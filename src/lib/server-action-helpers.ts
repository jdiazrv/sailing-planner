import type { VisitPanelDisplayMode } from "@/types/database";

export const asOptionalString = (value: FormDataEntryValue | null) => {
  const normalized = value?.toString().trim();
  return normalized ? normalized : null;
};

export const parseOptionalYear = (value: FormDataEntryValue | null) => {
  const normalized = asOptionalString(value);
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 1800 || parsed > 3000) {
    throw new Error("Year built must be a valid year.");
  }

  return parsed;
};

export const resolveVisitPanelDisplayMode = (
  value: FormDataEntryValue | null,
): VisitPanelDisplayMode => {
  const mode = value?.toString();
  return mode === "text" || mode === "image" || mode === "both" ? mode : "both";
};

export const throwIfError = (error: { message?: string } | null) => {
  if (error) {
    throw new Error(error.message ?? "Unexpected Supabase error.");
  }
};