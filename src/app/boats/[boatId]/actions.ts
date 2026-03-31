"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type {
  LocationType,
  PlaceSource,
  TripSegmentStatus,
  VisitStatus,
} from "@/types/database";

const refreshBoatRoutes = (boatId: string) => {
  revalidatePath("/dashboard");
  revalidatePath(`/boats/${boatId}/trip`);
  revalidatePath(`/boats/${boatId}/visits`);
};

const asOptionalString = (value: FormDataEntryValue | null) => {
  const normalized = value?.toString().trim();
  return normalized ? normalized : null;
};

export async function saveSeason(formData: FormData) {
  const supabase = await createClient();
  const db = supabase as any;
  const boatId = formData.get("boat_id")?.toString() ?? "";
  const seasonId = asOptionalString(formData.get("season_id"));

  const payload = {
    boat_id: boatId,
    year: Number(formData.get("year")),
    start_date: formData.get("start_date")?.toString() ?? "",
    end_date: formData.get("end_date")?.toString() ?? "",
    name: formData.get("name")?.toString() ?? "",
    notes: asOptionalString(formData.get("notes")),
  };

  if (seasonId) {
    await db.from("seasons").update(payload).eq("id", seasonId);
  } else {
    await db.from("seasons").insert(payload);
  }

  refreshBoatRoutes(boatId);
}

export async function deleteSeason(formData: FormData) {
  const supabase = await createClient();
  const db = supabase as any;
  const boatId = formData.get("boat_id")?.toString() ?? "";
  const seasonId = formData.get("season_id")?.toString() ?? "";

  await db.from("seasons").delete().eq("id", seasonId);
  refreshBoatRoutes(boatId);
}

export async function saveTripSegment(formData: FormData) {
  const supabase = await createClient();
  const db = supabase as any;
  const boatId = formData.get("boat_id")?.toString() ?? "";
  const segmentId = asOptionalString(formData.get("segment_id"));
  const seasonId = formData.get("season_id")?.toString() ?? "";
  const privateNotes = asOptionalString(formData.get("private_notes"));

  const payload = {
    season_id: seasonId,
    start_date: formData.get("start_date")?.toString() ?? "",
    end_date: formData.get("end_date")?.toString() ?? "",
    location_label: formData.get("location_label")?.toString() ?? "",
    location_type:
      (formData.get("location_type")?.toString() as LocationType) ?? "other",
    place_source:
      (formData.get("place_source")?.toString() as PlaceSource) ?? "manual",
    external_place_id: asOptionalString(formData.get("external_place_id")),
    latitude: asOptionalString(formData.get("latitude"))
      ? Number(formData.get("latitude"))
      : null,
    longitude: asOptionalString(formData.get("longitude"))
      ? Number(formData.get("longitude"))
      : null,
    status:
      (formData.get("status")?.toString() as TripSegmentStatus) ?? "planned",
    public_notes: asOptionalString(formData.get("public_notes")),
  };

  let resolvedId = segmentId;

  if (segmentId) {
    await db.from("trip_segments").update(payload).eq("id", segmentId);
  } else {
    const { data } = await db
      .from("trip_segments")
      .insert(payload)
      .select("id")
      .single();
    resolvedId = data?.id ?? null;
  }

  if (resolvedId) {
    if (privateNotes) {
      await db.from("trip_segment_private_notes").upsert({
        trip_segment_id: resolvedId,
        private_notes: privateNotes,
      });
    } else {
      await db
        .from("trip_segment_private_notes")
        .delete()
        .eq("trip_segment_id", resolvedId);
    }
  }

  refreshBoatRoutes(boatId);
}

export async function deleteTripSegment(formData: FormData) {
  const supabase = await createClient();
  const db = supabase as any;
  const boatId = formData.get("boat_id")?.toString() ?? "";
  const segmentId = formData.get("segment_id")?.toString() ?? "";

  await db.from("trip_segments").delete().eq("id", segmentId);
  refreshBoatRoutes(boatId);
}

export async function saveVisit(formData: FormData) {
  const supabase = await createClient();
  const db = supabase as any;
  const boatId = formData.get("boat_id")?.toString() ?? "";
  const visitId = asOptionalString(formData.get("visit_id"));
  const seasonId = formData.get("season_id")?.toString() ?? "";
  const privateNotes = asOptionalString(formData.get("private_notes"));

  const payload = {
    season_id: seasonId,
    visitor_name: formData.get("visitor_name")?.toString() ?? "",
    embark_date: formData.get("embark_date")?.toString() ?? "",
    disembark_date: formData.get("disembark_date")?.toString() ?? "",
    embark_place_label: asOptionalString(formData.get("embark_place_label")),
    embark_place_source:
      (formData.get("embark_place_source")?.toString() as PlaceSource) ??
      "manual",
    embark_external_place_id: asOptionalString(
      formData.get("embark_external_place_id"),
    ),
    embark_latitude: asOptionalString(formData.get("embark_latitude"))
      ? Number(formData.get("embark_latitude"))
      : null,
    embark_longitude: asOptionalString(formData.get("embark_longitude"))
      ? Number(formData.get("embark_longitude"))
      : null,
    disembark_place_label: asOptionalString(
      formData.get("disembark_place_label"),
    ),
    disembark_place_source:
      (formData.get("disembark_place_source")?.toString() as PlaceSource) ??
      "manual",
    disembark_external_place_id: asOptionalString(
      formData.get("disembark_external_place_id"),
    ),
    disembark_latitude: asOptionalString(formData.get("disembark_latitude"))
      ? Number(formData.get("disembark_latitude"))
      : null,
    disembark_longitude: asOptionalString(formData.get("disembark_longitude"))
      ? Number(formData.get("disembark_longitude"))
      : null,
    status: (formData.get("status")?.toString() as VisitStatus) ?? "tentative",
    public_notes: asOptionalString(formData.get("public_notes")),
  };

  let resolvedId = visitId;

  if (visitId) {
    await db.from("visits").update(payload).eq("id", visitId);
  } else {
    const { data } = await db
      .from("visits")
      .insert(payload)
      .select("id")
      .single();
    resolvedId = data?.id ?? null;
  }

  if (resolvedId) {
    if (privateNotes) {
      await db.from("visit_private_notes").upsert({
        visit_id: resolvedId,
        private_notes: privateNotes,
      });
    } else {
      await db.from("visit_private_notes").delete().eq("visit_id", resolvedId);
    }
  }

  refreshBoatRoutes(boatId);
}

export async function deleteVisit(formData: FormData) {
  const supabase = await createClient();
  const db = supabase as any;
  const boatId = formData.get("boat_id")?.toString() ?? "";
  const visitId = formData.get("visit_id")?.toString() ?? "";

  await db.from("visits").delete().eq("id", visitId);
  refreshBoatRoutes(boatId);
}
