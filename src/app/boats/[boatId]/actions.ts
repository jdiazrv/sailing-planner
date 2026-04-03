"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  generateSeasonAccessLink as generateSeasonAccessLinkInternal,
  purgeRevokedSeasonAccessLinks as purgeRevokedSeasonAccessLinksInternal,
  revokeSeasonAccessLink as revokeSeasonAccessLinkInternal,
} from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";
import type {
  Database,
  LocationType,
  PlaceSource,
  TripSegmentStatus,
  VisitStatus,
} from "@/types/database";

export async function trackLastBoat(boatId: string) {
  const store = await cookies();
  store.set("lastBoatId", boatId, {
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
    httpOnly: true,
    sameSite: "lax",
  });
}

const refreshBoatRoutes = (boatId: string) => {
  revalidatePath("/dashboard");
  revalidatePath(`/boats/${boatId}/trip`);
  revalidatePath(`/boats/${boatId}/visits`);
};

const asOptionalString = (value: FormDataEntryValue | null) => {
  const normalized = value?.toString().trim();
  return normalized ? normalized : null;
};

const parseOptionalYear = (value: FormDataEntryValue | null) => {
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

const getBoatImageExtension = (file: File) => {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  if (file.type === "image/svg+xml") return "svg";
  return "jpg";
};

const throwIfError = (error: { message?: string } | null) => {
  if (error) {
    throw new Error(error.message ?? "Unexpected Supabase error.");
  }
};

const requireBoatEditor = async (boatId: string) => {
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required.");
  }

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("is_superuser")
    .eq("id", user.id)
    .maybeSingle();
  throwIfError(profileError);

  if (profile?.is_superuser) {
    return { supabase, db };
  }

  const { data: permission, error: permissionError } = await db
    .from("user_boat_permissions")
    .select("can_edit")
    .eq("boat_id", boatId)
    .eq("user_id", user.id)
    .maybeSingle();
  throwIfError(permissionError);

  if (!permission?.can_edit) {
    throw new Error("You do not have permission to edit this boat.");
  }

  return { supabase, db };
};

const getNextTripSortOrder = async (db: any, seasonId: string) => {
  const { data, error } = await db
    .from("trip_segments")
    .select("sort_order")
    .eq("season_id", seasonId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(error);
  return (data?.sort_order ?? 0) + 10;
};

export async function saveSeason(formData: FormData) {
  const boatId = formData.get("boat_id")?.toString() ?? "";
  const { db } = await requireBoatEditor(boatId);
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
    const { error } = await db.from("seasons").update(payload).eq("id", seasonId);
    throwIfError(error);
  } else {
    const { error } = await db.from("seasons").insert(payload);
    throwIfError(error);
  }

  refreshBoatRoutes(boatId);
}

export async function deleteSeason(formData: FormData) {
  const boatId = formData.get("boat_id")?.toString() ?? "";
  const { db } = await requireBoatEditor(boatId);
  const seasonId = formData.get("season_id")?.toString() ?? "";

  const { error } = await db.from("seasons").delete().eq("id", seasonId);
  throwIfError(error);
  refreshBoatRoutes(boatId);
}

export async function saveTripSegment(formData: FormData) {
  const boatId = formData.get("boat_id")?.toString() ?? "";
  const { db } = await requireBoatEditor(boatId);
  const segmentId = asOptionalString(formData.get("segment_id"));
  const seasonId = formData.get("season_id")?.toString() ?? "";
  const privateNotes = asOptionalString(formData.get("private_notes"));

  const payload = {
    season_id: seasonId,
    sort_order: segmentId
      ? Number(formData.get("sort_order") ?? 0)
      : await getNextTripSortOrder(db, seasonId),
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
    const { error } = await db
      .from("trip_segments")
      .update(payload)
      .eq("id", segmentId);
    throwIfError(error);
  } else {
    const { data, error } = await db
      .from("trip_segments")
      .insert(payload)
      .select("id")
      .single();
    throwIfError(error);
    resolvedId = data?.id ?? null;
  }

  if (resolvedId) {
    if (privateNotes) {
      const { error } = await db.from("trip_segment_private_notes").upsert({
        trip_segment_id: resolvedId,
        private_notes: privateNotes,
      });
      throwIfError(error);
    } else {
      const { error } = await db
        .from("trip_segment_private_notes")
        .delete()
        .eq("trip_segment_id", resolvedId);
      throwIfError(error);
    }
  }

  refreshBoatRoutes(boatId);
}

export async function moveTripSegment(formData: FormData) {
  const boatId = formData.get("boat_id")?.toString() ?? "";
  const { db } = await requireBoatEditor(boatId);
  const seasonId = formData.get("season_id")?.toString() ?? "";
  const segmentId = formData.get("segment_id")?.toString() ?? "";
  const direction = formData.get("direction")?.toString();

  const { data: segments, error } = await db
    .from("trip_segments")
    .select("id, sort_order")
    .eq("season_id", seasonId)
    .order("sort_order", { ascending: true })
    .order("start_date", { ascending: true });

  throwIfError(error);

  const ordered = (segments ?? []) as { id: string; sort_order: number }[];
  const index = ordered.findIndex((segment) => segment.id === segmentId);
  const targetIndex =
    direction === "up" ? index - 1 : direction === "down" ? index + 1 : index;

  if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
    return;
  }

  const current = ordered[index];
  const target = ordered[targetIndex];

  const { error: firstError } = await db
    .from("trip_segments")
    .update({ sort_order: -1 })
    .eq("id", current.id);
  throwIfError(firstError);

  const { error: secondError } = await db
    .from("trip_segments")
    .update({ sort_order: current.sort_order })
    .eq("id", target.id);
  throwIfError(secondError);

  const { error: thirdError } = await db
    .from("trip_segments")
    .update({ sort_order: target.sort_order })
    .eq("id", current.id);
  throwIfError(thirdError);

  refreshBoatRoutes(boatId);
}

export async function deleteTripSegment(formData: FormData) {
  const boatId = formData.get("boat_id")?.toString() ?? "";
  const { db } = await requireBoatEditor(boatId);
  const segmentId = formData.get("segment_id")?.toString() ?? "";

  const { error } = await db.from("trip_segments").delete().eq("id", segmentId);
  throwIfError(error);
  refreshBoatRoutes(boatId);
}

export async function saveVisit(formData: FormData) {
  const boatId = formData.get("boat_id")?.toString() ?? "";
  const { supabase, db } = await requireBoatEditor(boatId);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const visitId = asOptionalString(formData.get("visit_id"));
  const seasonId = formData.get("season_id")?.toString() ?? "";
  const privateNotes = asOptionalString(formData.get("private_notes"));

  const basePayload = {
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
    const { error } = await db.from("visits").update(basePayload).eq("id", visitId);
    throwIfError(error);
  } else {
    const { data, error } = await db
      .from("visits")
      .insert({
        ...basePayload,
        owner_user_id: user?.id ?? null,
      })
      .select("id")
      .single();
    throwIfError(error);
    resolvedId = data?.id ?? null;
  }

  if (resolvedId) {
    if (privateNotes) {
      const { error } = await db.from("visit_private_notes").upsert({
        visit_id: resolvedId,
        private_notes: privateNotes,
      });
      throwIfError(error);
    } else {
      const { error } = await db
        .from("visit_private_notes")
        .delete()
        .eq("visit_id", resolvedId);
      throwIfError(error);
    }
  }

  refreshBoatRoutes(boatId);
}

export async function deleteVisit(formData: FormData) {
  const boatId = formData.get("boat_id")?.toString() ?? "";
  const { db } = await requireBoatEditor(boatId);
  const visitId = formData.get("visit_id")?.toString() ?? "";

  const { error } = await db.from("visits").delete().eq("id", visitId);
  throwIfError(error);
  refreshBoatRoutes(boatId);
}

export async function generateSeasonAccessLink(formData: FormData) {
  return generateSeasonAccessLinkInternal(formData);
}

export async function revokeSeasonAccessLink(formData: FormData) {
  return revokeSeasonAccessLinkInternal(formData);
}

export async function purgeRevokedSeasonAccessLinks(formData: FormData) {
  return purgeRevokedSeasonAccessLinksInternal(formData);
}

export async function saveBoatProfile(formData: FormData) {
  const boatId = formData.get("boat_id")?.toString() ?? "";
  const { db } = await requireBoatEditor(boatId);

  const payload: Partial<Database["public"]["Tables"]["boats"]["Update"]> = {
    model: asOptionalString(formData.get("model")),
    year_built: parseOptionalYear(formData.get("year_built")),
    home_port: asOptionalString(formData.get("home_port")),
    description: asOptionalString(formData.get("description")),
  };

  const { error } = await db.from("boats").update(payload).eq("id", boatId);
  throwIfError(error);
  refreshBoatRoutes(boatId);
}

export async function uploadBoatProfileImage(formData: FormData) {
  const boatId = formData.get("boat_id")?.toString() ?? "";
  const { supabase, db } = await requireBoatEditor(boatId);
  const file = formData.get("image");

  if (!(file instanceof File) || file.size === 0) {
    return;
  }

  const { data: boat } = await db
    .from("boats")
    .select("image_path")
    .eq("id", boatId)
    .single();

  const extension = getBoatImageExtension(file);
  const nextPath = `${boatId}/cover-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from("boat-images").upload(nextPath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  throwIfError(uploadError);

  const { error: updateError } = await db
    .from("boats")
    .update({ image_path: nextPath })
    .eq("id", boatId);
  throwIfError(updateError);

  if (boat?.image_path) {
    const { error: removeError } = await supabase.storage.from("boat-images").remove([boat.image_path]);
    throwIfError(removeError);
  }

  refreshBoatRoutes(boatId);
}

export async function removeBoatProfileImage(formData: FormData) {
  const boatId = formData.get("boat_id")?.toString() ?? "";
  const { supabase, db } = await requireBoatEditor(boatId);

  const { data: boat } = await db
    .from("boats")
    .select("image_path")
    .eq("id", boatId)
    .single();

  if (boat?.image_path) {
    const { error } = await supabase.storage.from("boat-images").remove([boat.image_path]);
    throwIfError(error);
  }

  const { error } = await db.from("boats").update({ image_path: null }).eq("id", boatId);
  throwIfError(error);
  refreshBoatRoutes(boatId);
}
