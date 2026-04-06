import { getDocumentLocale, getIntlLocale } from "@/lib/i18n";
import type { Database, OnboardingStep, PermissionLevel } from "@/types/database";

export type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];
export type BoatRow = Database["public"]["Tables"]["boats"]["Row"];
export type PermissionRow = Database["public"]["Tables"]["user_boat_permissions"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type SeasonAccessLinkRow = Database["public"]["Tables"]["season_access_links"]["Row"];

export type PortStopView =
  Database["public"]["Functions"]["get_season_port_stops"]["Returns"][number];
export type VisitPanelDisplayMode =
  Database["public"]["Enums"]["visit_panel_display_mode"];
export type VisitView =
  Database["public"]["Functions"]["get_season_visits"]["Returns"][number] & {
    image_url?: string | null;
  };

export type BoatSummary = Database["public"]["Views"]["boat_access_overview"]["Row"] & {
  description?: string | null;
  home_port?: string | null;
  model?: string | null;
  year_built?: number | null;
  image_path?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  port_stops_count?: number;
  visits_count?: number;
  active_invites_count?: number;
  user_last_access_at?: string | null;
  user_display_name?: string | null;
  user_email?: string | null;
};

export type BoatDetails = BoatRow & {
  image_url?: string | null;
  port_stops_count?: number;
  visits_count?: number;
  active_invites_count?: number;
  user_last_access_at?: string | null;
  user_display_name?: string | null;
  user_email?: string | null;
  users_count?: number;
  managers_count?: number;
  editors_count?: number;
};

export type CreatedUserSummary = {
  id: string;
  display_name: string | null;
  email: string | null;
  boat_id: string | null;
  permission_level: PermissionLevel;
  last_sign_in_at: string | null;
};

export type UserAdminProfile = ProfileRow & {
  permissions: PermissionRow[];
  boats_count?: number;
  seasons_count?: number;
  port_stops_count?: number;
  visits_count?: number;
  invites_generated_count?: number;
  created_users?: CreatedUserSummary[];
};

export type SharedTimelineBoat = {
  boat: BoatDetails;
  season: SeasonRow | null;
  ownerDisplayName: string | null;
  tripSegments: PortStopView[];
};

export type ViewerContext = {
  profile: ProfileRow | null;
  isSuperuser: boolean;
  onboardingPending?: boolean;
  onboardingStep?: OnboardingStep | null;
  isSeasonGuest?: boolean;
  seasonGuestCanViewVisits?: boolean;
  seasonGuestCreatorName?: string | null;
  seasonGuestExpiresAt?: string | null;
};

export type BoatWorkspace = {
  viewer: ViewerContext;
  boat: BoatDetails;
  permission: PermissionRow | null;
  boats: BoatSummary[];
  seasons: SeasonRow[];
  selectedSeason: SeasonRow | null;
  tripSegments: PortStopView[];
  visits: VisitView[];
};

export type SeasonAccessLinkSummary = SeasonAccessLinkRow & {
  is_active: boolean;
  creator_name?: string | null;
};

export type AvailabilityStatus =
  | "available"
  | "occupied"
  | "tentative"
  | "undefined";

export type AvailabilityBlock = {
  start: string;
  end: string;
  status: AvailabilityStatus;
  label: string;
};

export type VisitConflict = {
  visitId: string;
  severity: "warning";
  message: string;
};

export const hasVisitDateRange = (
  visit: Pick<VisitView, "embark_date" | "disembark_date">,
): visit is Pick<VisitView, "embark_date" | "disembark_date"> & {
  embark_date: string;
  disembark_date: string;
} => Boolean(visit.embark_date && visit.disembark_date);

const isRangeFullyCovered = (
  segments: PortStopView[],
  start: string,
  end: string,
) => {
  const totalDays = diffDaysInclusive(start, end);

  for (let index = 0; index < totalDays; index += 1) {
    const day = addDays(start, index);
    const covered = segments.some((segment) =>
      rangeIncludes(segment.start_date, segment.end_date, day),
    );

    if (!covered) {
      return false;
    }
  }

  return true;
};

export const formatLongDate = (value: string) =>
  new Intl.DateTimeFormat(getIntlLocale(getDocumentLocale()), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parseDate(value));

export const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat(getIntlLocale(getDocumentLocale()), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parseDate(value));

const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const parseDate = (value: string) => {
  const match = DATE_INPUT_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Invalid date value: ${value}`);
  }

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date value: ${value}`);
  }

  return parsed;
};

export const toDateInputValue = (value: Date) =>
  value.toISOString().slice(0, 10);

export const addDays = (value: string, amount: number) => {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateInputValue(date);
};

export const diffDaysInclusive = (start: string, end: string) =>
  Math.max(
    1,
    Math.floor(
      (parseDate(end).getTime() - parseDate(start).getTime()) / 86_400_000,
    ) + 1,
  );

export const rangeIncludes = (start: string, end: string, point: string) =>
  point >= start && point <= end;

export const overlaps = (
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string,
) => leftStart <= rightEnd && rightStart <= leftEnd;

export const nauticalMilesBetweenPoints = (
  startLatitude: number | null,
  startLongitude: number | null,
  endLatitude: number | null,
  endLongitude: number | null,
) => {
  if (
    typeof startLatitude !== "number" ||
    typeof startLongitude !== "number" ||
    typeof endLatitude !== "number" ||
    typeof endLongitude !== "number"
  ) {
    return null;
  }

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusNauticalMiles = 3440.065;
  const latitudeDelta = toRadians(endLatitude - startLatitude);
  const longitudeDelta = toRadians(endLongitude - startLongitude);
  const startLatitudeRad = toRadians(startLatitude);
  const endLatitudeRad = toRadians(endLatitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitudeRad) *
      Math.cos(endLatitudeRad) *
      Math.sin(longitudeDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusNauticalMiles * c;
};

export const getPermissionLabel = (
  level: PermissionLevel | null | undefined,
  isSuperuser = false,
) => {
  if (isSuperuser && !level) {
    return "superuser";
  }

  return level ?? "viewer";
};

export const computeAvailability = (
  season: SeasonRow | null,
  tripSegments: PortStopView[],
  visits: VisitView[],
) => {
  if (!season) {
    return [] as AvailabilityBlock[];
  }

  const dayStatuses: AvailabilityStatus[] = [];
  const days = diffDaysInclusive(season.start_date, season.end_date);

  for (let index = 0; index < days; index += 1) {
    const day = addDays(season.start_date, index);
    const hasSegment = tripSegments.some((segment) =>
      rangeIncludes(segment.start_date, segment.end_date, day),
    );
    const hasConfirmedVisit = visits.some(
      (visit) =>
        hasVisitDateRange(visit) &&
        (visit.status === "confirmed" || visit.status === "blocked") &&
        rangeIncludes(visit.embark_date, visit.disembark_date, day),
    );
    const hasTentativeVisit = visits.some(
      (visit) =>
        hasVisitDateRange(visit) &&
        visit.status === "tentative" &&
        rangeIncludes(visit.embark_date, visit.disembark_date, day),
    );

    if (hasConfirmedVisit) {
      dayStatuses.push("occupied");
    } else if (!hasSegment) {
      dayStatuses.push("undefined");
    } else if (hasTentativeVisit) {
      dayStatuses.push("tentative");
    } else {
      dayStatuses.push("available");
    }
  }

  return compressStatusBlocks(season.start_date, dayStatuses);
};

const compressStatusBlocks = (
  seasonStart: string,
  dayStatuses: AvailabilityStatus[],
) => {
  if (!dayStatuses.length) {
    return [] as AvailabilityBlock[];
  }

  const blocks: AvailabilityBlock[] = [];
  let startIndex = 0;

  for (let index = 1; index <= dayStatuses.length; index += 1) {
    const previousStatus = dayStatuses[index - 1];
    const nextStatus = dayStatuses[index];

    if (nextStatus !== previousStatus) {
      blocks.push({
        start: addDays(seasonStart, startIndex),
        end: addDays(seasonStart, index - 1),
        status: previousStatus,
        label: getAvailabilityLabel(previousStatus),
      });
      startIndex = index;
    }
  }

  return blocks;
};

const getAvailabilityLabel = (status: AvailabilityStatus) => {
  switch (status) {
    case "available":
      return "Available";
    case "occupied":
      return "Occupied";
    case "tentative":
      return "Tentative";
    case "undefined":
      return "Undefined";
  }
};

export const computeVisitConflicts = (
  season: SeasonRow | null,
  tripSegments: PortStopView[],
  visits: VisitView[],
) => {
  if (!season) {
    return [] as VisitConflict[];
  }

  const conflicts: VisitConflict[] = [];

  visits.forEach((visit, visitIndex) => {
    if (visit.status === "blocked") {
      return;
    }

    if (!hasVisitDateRange(visit)) {
      conflicts.push({
        visitId: visit.id,
        severity: "warning",
        message: `${visit.visitor_name ?? "Visit"} has restricted dates and cannot be validated completely.`,
      });
      return;
    }

    if (
      visit.embark_date < season.start_date ||
      visit.disembark_date > season.end_date
    ) {
      conflicts.push({
        visitId: visit.id,
        severity: "warning",
        message: `${visit.visitor_name ?? "Visit"} falls partly outside the selected season.`,
      });
    }

    const embarkCovered = tripSegments.some((segment) =>
      rangeIncludes(segment.start_date, segment.end_date, visit.embark_date),
    );
    const disembarkCovered = tripSegments.some((segment) =>
      rangeIncludes(segment.start_date, segment.end_date, visit.disembark_date),
    );
    const fullRangeCovered = isRangeFullyCovered(
      tripSegments,
      visit.embark_date,
      visit.disembark_date,
    );

    if (!embarkCovered) {
      conflicts.push({
        visitId: visit.id,
        severity: "warning",
        message: `${visit.visitor_name ?? "Visit"} embarks in a period without a trip segment.`,
      });
    }

    if (!disembarkCovered) {
      conflicts.push({
        visitId: visit.id,
        severity: "warning",
        message: `${visit.visitor_name ?? "Visit"} disembarks in a period without a trip segment.`,
      });
    }

    if (embarkCovered && disembarkCovered && !fullRangeCovered) {
      conflicts.push({
        visitId: visit.id,
        severity: "warning",
        message: `${visit.visitor_name ?? "Visit"} crosses a gap without trip coverage.`,
      });
    }

    visits.slice(visitIndex + 1).forEach((otherVisit) => {
      if (!hasVisitDateRange(otherVisit)) {
        return;
      }
      if (
        visit.status === "confirmed" &&
        otherVisit.status === "confirmed" &&
        overlaps(
          visit.embark_date,
          visit.disembark_date,
          otherVisit.embark_date,
          otherVisit.disembark_date,
        )
      ) {
        conflicts.push({
          visitId: visit.id,
          severity: "warning",
          message: `${visit.visitor_name ?? "Visit"} overlaps with confirmed visit ${otherVisit.visitor_name ?? "another visit"}.`,
        });
      }
    });
  });

  return conflicts;
};

export const getDefaultSeasonDraft = (boatId: string, year?: number) => {
  const resolvedYear = year ?? new Date().getUTCFullYear();

  return {
    boat_id: boatId,
    year: resolvedYear,
    start_date: `${resolvedYear}-04-01`,
    end_date: `${resolvedYear}-10-31`,
    name: `${resolvedYear} Season`,
    notes: "",
  };
};

export const getEmptyTripSegmentDraft = (season: SeasonRow | null) => {
  const fallbackStart =
    season?.start_date ?? `${new Date().getUTCFullYear()}-04-01`;

  return {
    start_date: fallbackStart,
    end_date: fallbackStart,
    location_label: "",
    location_type: "zone",
    place_source: "manual",
    status: "tentative",
    public_notes: "",
    private_notes: "",
  };
};

export const getEmptyVisitDraft = (season: SeasonRow | null) => {
  const fallbackStart =
    season?.start_date ?? `${new Date().getUTCFullYear()}-04-01`;

  return {
    visitor_name: "",
    embark_date: fallbackStart,
    disembark_date: fallbackStart,
    embark_place_label: "",
    embark_place_source: "manual",
    disembark_place_label: "",
    disembark_place_source: "manual",
    status: "tentative",
    public_notes: "",
    private_notes: "",
  };
};
