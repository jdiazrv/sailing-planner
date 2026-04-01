"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";

import { requireSuperuser } from "@/lib/boat-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAuthRedirectUrl } from "@/lib/env";
import type { PermissionLevel, PreferredLanguage } from "@/types/database";

const asOptionalString = (value: FormDataEntryValue | null) => {
  const normalized = value?.toString().trim();
  return normalized ? normalized : null;
};

const toBoolean = (value: FormDataEntryValue | null) => value?.toString() === "on";
const throwIfError = (error: { message?: string } | null) => {
  if (error) {
    throw new Error(error.message ?? "Unexpected Supabase error.");
  }
};

const buildBoatPermissionPayload = (formData: FormData, userId: string) => {
  const boatId = formData.get("boat_id")?.toString() ?? "";

  if (!boatId) {
    throw new Error("Boat is required for invitations.");
  }

  return {
    user_id: userId,
    boat_id: boatId,
    permission_level:
      (formData.get("permission_level")?.toString() as PermissionLevel) ?? "viewer",
    can_edit: toBoolean(formData.get("can_edit")),
    can_view_all_visits: toBoolean(formData.get("can_view_all_visits")),
    can_view_visit_names: toBoolean(formData.get("can_view_visit_names")),
    can_view_private_notes: toBoolean(formData.get("can_view_private_notes")),
    can_view_only_own_visit: toBoolean(formData.get("can_view_only_own_visit")),
    can_manage_boat_users: toBoolean(formData.get("can_manage_boat_users")),
    can_view_availability:
      formData.get("can_view_availability") === null
        ? true
        : toBoolean(formData.get("can_view_availability")),
  };
};

const refreshAdminRoutes = (boatId?: string | null) => {
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/admin/boats");
  revalidatePath("/admin/users");

  if (boatId) {
    revalidatePath(`/boats/${boatId}`);
    revalidatePath(`/boats/${boatId}/trip`);
    revalidatePath(`/boats/${boatId}/visits`);
  }
};

export async function saveBoat(formData: FormData) {
  const { supabase } = await requireSuperuser();
  const db = supabase as any;
  const boatId = asOptionalString(formData.get("boat_id"));

  const payload = {
    name: formData.get("name")?.toString().trim() ?? "",
    description: asOptionalString(formData.get("description")),
    model: asOptionalString(formData.get("model")),
    year_built: asOptionalString(formData.get("year_built"))
      ? Number(formData.get("year_built"))
      : null,
    home_port: asOptionalString(formData.get("home_port")),
    notes: asOptionalString(formData.get("notes")),
    is_active: toBoolean(formData.get("is_active")),
  };

  let resolvedBoatId = boatId;

  if (boatId) {
    const { error } = await db.from("boats").update(payload).eq("id", boatId);
    throwIfError(error);
  } else {
    const { data, error } = await db
      .from("boats")
      .insert(payload)
      .select("id")
      .single();
    throwIfError(error);
    resolvedBoatId = data?.id ?? null;
  }

  refreshAdminRoutes(resolvedBoatId);
}

export async function deleteBoat(formData: FormData) {
  const { supabase } = await requireSuperuser();
  const db = supabase as any;
  const boatId = formData.get("boat_id")?.toString() ?? "";

  const { data: boat } = await db
    .from("boats")
    .select("image_path")
    .eq("id", boatId)
    .single();

  if (boat?.image_path) {
    const { error } = await supabase.storage.from("boat-images").remove([boat.image_path]);
    throwIfError(error);
  }

  const { error } = await db.from("boats").delete().eq("id", boatId);
  throwIfError(error);
  refreshAdminRoutes(boatId);
}

export async function uploadBoatImage(formData: FormData) {
  const { supabase } = await requireSuperuser();
  const db = supabase as any;
  const boatId = formData.get("boat_id")?.toString() ?? "";
  const file = formData.get("image");

  if (!(file instanceof File) || file.size === 0) {
    return;
  }

  const { data: boat } = await db
    .from("boats")
    .select("image_path")
    .eq("id", boatId)
    .single();

  const extension = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase() ?? "jpg"
    : "jpg";
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

  refreshAdminRoutes(boatId);
}

export async function removeBoatImage(formData: FormData) {
  const { supabase } = await requireSuperuser();
  const db = supabase as any;
  const boatId = formData.get("boat_id")?.toString() ?? "";

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
  refreshAdminRoutes(boatId);
}

export async function saveUserProfile(formData: FormData) {
  const { supabase } = await requireSuperuser();
  const db = supabase as any;
  const userId = formData.get("user_id")?.toString() ?? "";

  const { error } = await db
    .from("profiles")
    .update({
      display_name: asOptionalString(formData.get("display_name")),
      is_superuser: toBoolean(formData.get("is_superuser")),
      preferred_language:
        (formData.get("preferred_language")?.toString() as PreferredLanguage) ??
        "es",
    })
    .eq("id", userId);
  throwIfError(error);

  refreshAdminRoutes();
}

export async function saveUserBoatPermission(formData: FormData) {
  const { supabase } = await requireSuperuser();
  const db = supabase as any;
  const userId = formData.get("user_id")?.toString() ?? "";
  const boatId = formData.get("boat_id")?.toString() ?? "";

  const { error } = await db.from("user_boat_permissions").upsert(
    {
      user_id: userId,
      boat_id: boatId,
      permission_level:
        (formData.get("permission_level")?.toString() as PermissionLevel) ?? "viewer",
      can_edit: toBoolean(formData.get("can_edit")),
      can_view_all_visits: toBoolean(formData.get("can_view_all_visits")),
      can_view_visit_names: toBoolean(formData.get("can_view_visit_names")),
      can_view_private_notes: toBoolean(formData.get("can_view_private_notes")),
      can_view_only_own_visit: toBoolean(formData.get("can_view_only_own_visit")),
      can_manage_boat_users: toBoolean(formData.get("can_manage_boat_users")),
      can_view_availability: toBoolean(formData.get("can_view_availability")),
    },
    { onConflict: "user_id,boat_id" },
  );
  throwIfError(error);

  refreshAdminRoutes(boatId);
}

export async function deleteUserBoatPermission(formData: FormData) {
  const { supabase } = await requireSuperuser();
  const db = supabase as any;
  const userId = formData.get("user_id")?.toString() ?? "";
  const boatId = formData.get("boat_id")?.toString() ?? "";

  const { error } = await db
    .from("user_boat_permissions")
    .delete()
    .eq("user_id", userId)
    .eq("boat_id", boatId);
  throwIfError(error);

  refreshAdminRoutes(boatId);
}

export async function createUserAccount(formData: FormData) {
  await requireSuperuser();
  const admin = createAdminClient();

  if (!admin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured, so admin user creation is unavailable.",
    );
  }

  const email = formData.get("email")?.toString().trim() ?? "";
  const displayName = asOptionalString(formData.get("display_name"));
  const password = formData.get("password")?.toString() ?? "";
  const preferredLanguage =
    (formData.get("preferred_language")?.toString() as PreferredLanguage) ?? "es";

  if (!email) {
    throw new Error("Email is required.");
  }

  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      ...(displayName ? { display_name: displayName } : {}),
      preferred_language: preferredLanguage,
    },
  });

  if (error) {
    throw error;
  }

  if (data.user?.id) {
    const { supabase } = await requireSuperuser();
    const { error: profileError } = await (supabase as any)
      .from("profiles")
      .update({ preferred_language: preferredLanguage })
      .eq("id", data.user.id);
    throwIfError(profileError);
  }

  refreshAdminRoutes();
}

export async function inviteUserAccount(formData: FormData) {
  const { supabase } = await requireSuperuser();
  const admin = createAdminClient();

  if (!admin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured, so user invitations are unavailable.",
    );
  }

  const email = formData.get("email")?.toString().trim() ?? "";
  const displayName = asOptionalString(formData.get("display_name"));
  const preferredLanguage =
    (formData.get("preferred_language")?.toString() as PreferredLanguage) ?? "es";

  if (!email) {
    throw new Error("Email is required.");
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      ...(displayName ? { display_name: displayName } : {}),
      preferred_language: preferredLanguage,
    },
    redirectTo: buildAuthRedirectUrl("/auth/set-password"),
  });

  if (error) {
    throw error;
  }

  if (data.user?.id) {
    const db = supabase as any;
    const { error: profileError } = await (supabase as any)
      .from("profiles")
      .update({
        display_name: displayName,
        preferred_language: preferredLanguage,
      })
      .eq("id", data.user.id);
    throwIfError(profileError);

    const { error: permissionError } = await db
      .from("user_boat_permissions")
      .upsert(buildBoatPermissionPayload(formData, data.user.id), {
        onConflict: "user_id,boat_id",
      });
    throwIfError(permissionError);
  }

  refreshAdminRoutes(formData.get("boat_id")?.toString());
}

export async function updateUserPassword(formData: FormData) {
  await requireSuperuser();
  const admin = createAdminClient();

  if (!admin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured, so password changes are unavailable.",
    );
  }

  const userId = formData.get("user_id")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const { error } = await admin.auth.admin.updateUserById(userId, { password });

  if (error) {
    throw error;
  }

  refreshAdminRoutes();
}

export async function deleteUserAccount(formData: FormData) {
  const { supabase, user } = await requireSuperuser();
  const admin = createAdminClient();

  if (!admin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured, so user deletion is unavailable.",
    );
  }

  const userId = formData.get("user_id")?.toString() ?? "";

  if (!userId) {
    throw new Error("User id is required.");
  }

  if (user.id === userId) {
    throw new Error("You cannot delete your own superuser account.");
  }

  const db = supabase as any;
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("is_superuser")
    .eq("id", userId)
    .maybeSingle();
  throwIfError(profileError);

  if (profile?.is_superuser) {
    const { count, error: countError } = await db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_superuser", true);
    throwIfError(countError);

    if ((count ?? 0) <= 1) {
      throw new Error("At least one superuser account must remain.");
    }
  }

  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) {
    throw error;
  }

  refreshAdminRoutes();
}
