"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import {
  requireBoatShareAccess,
  requireSuperuser,
  requireUserAdminAccess,
} from "@/lib/boat-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAuthRedirectUrl, resolveAppOrigin } from "@/lib/env";
import {
  buildSeasonAccessUrl,
  generateSeasonAccessToken,
  getSeasonAccessExpiry,
  hashSeasonAccessToken,
  type SeasonAccessWindow,
} from "@/lib/season-access";
import type { PermissionLevel, PreferredLanguage } from "@/types/database";

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

const toBoolean = (value: FormDataEntryValue | null) => value?.toString() === "on";
const throwIfError = (error: { message?: string } | null) => {
  if (error) {
    throw new Error(error.message ?? "Unexpected Supabase error.");
  }
};

const requireProfileAdminClient = () => {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for cross-user profile administration.",
    );
  }

  return admin as any;
};

const getRequestOriginFromHeaders = async () => {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = forwardedProto ?? (isLocalhost ? "http" : "https");
  return host ? `${proto}://${host}` : null;
};

const assertManageableUser = async (
  db: any,
  actorUserId: string,
  manageableBoatIds: string[] | null,
  targetUserId: string,
) => {
  if (actorUserId === targetUserId || manageableBoatIds === null) {
    return;
  }

  const { data, error } = await db
    .from("user_boat_permissions")
    .select("boat_id")
    .eq("user_id", targetUserId)
    .in("boat_id", manageableBoatIds)
    .limit(1);
  throwIfError(error);

  if (!(data ?? []).length) {
    throw new Error("You can only manage users assigned to boats you administer.");
  }
};

const buildBoatPermissionPayload = (
  formData: FormData,
  userId: string,
  allowManagerRole = true,
) => {
  const boatId = formData.get("boat_id")?.toString() ?? "";
  const requestedLevel =
    (formData.get("permission_level")?.toString() as PermissionLevel) ?? "viewer";
  const permissionLevel =
    !allowManagerRole && requestedLevel === "manager" ? "editor" : requestedLevel;

  if (!boatId) {
    throw new Error("Boat is required for invitations.");
  }

  return {
    user_id: userId,
    boat_id: boatId,
    permission_level: permissionLevel,
    can_edit: toBoolean(formData.get("can_edit")),
    can_view_all_visits: toBoolean(formData.get("can_view_all_visits")),
    can_view_visit_names: toBoolean(formData.get("can_view_visit_names")),
    can_view_private_notes: toBoolean(formData.get("can_view_private_notes")),
    can_view_only_own_visit: toBoolean(formData.get("can_view_only_own_visit")),
    can_manage_boat_users:
      allowManagerRole && toBoolean(formData.get("can_manage_boat_users")),
    can_view_availability:
      formData.get("can_view_availability") === null
        ? true
        : toBoolean(formData.get("can_view_availability")),
  };
};

const assertManageableBoat = (manageableBoatIds: string[] | null, boatId: string) => {
  if (manageableBoatIds && !manageableBoatIds.includes(boatId)) {
    throw new Error("You can only manage users for boats assigned to you.");
  }
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
  const name = formData.get("name")?.toString().trim() ?? "";

  if (!name) {
    throw new Error("Boat name is required.");
  }

  const payload = {
    name,
    description: asOptionalString(formData.get("description")),
    model: asOptionalString(formData.get("model")),
    year_built: parseOptionalYear(formData.get("year_built")),
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

  if (!boatId && resolvedBoatId) {
    return { id: resolvedBoatId };
  }
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
  const { supabase, user, viewer, manageableBoatIds } = await requireUserAdminAccess();
  const adminDb = requireProfileAdminClient();
  const db = supabase as any;
  const userId = formData.get("user_id")?.toString() ?? "";
  const isSuperuser = toBoolean(formData.get("is_superuser"));
  const isTimelinePublic = toBoolean(formData.get("is_timeline_public"));
  const onboardingPending = toBoolean(formData.get("onboarding_pending"));

  if (!viewer.isSuperuser && isSuperuser) {
    throw new Error("Only a superuser can grant superuser access.");
  }

  await assertManageableUser(db, user.id, manageableBoatIds, userId);

  const profilePayload = {
    display_name: asOptionalString(formData.get("display_name")),
    is_superuser: viewer.isSuperuser ? isSuperuser : false,
    is_timeline_public: isTimelinePublic,
    preferred_language:
      (formData.get("preferred_language")?.toString() as PreferredLanguage) ??
      "es",
    ...(viewer.isSuperuser ? { onboarding_pending: onboardingPending } : {}),
  };

  const { error } = await adminDb
    .from("profiles")
    .update(profilePayload)
    .eq("id", userId);
  throwIfError(error);

  let primaryBoatId: string | null = null;

  if (!isSuperuser) {
    const { data: permissions, error: permissionsError } = await db
      .from("user_boat_permissions")
      .select("boat_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    throwIfError(permissionsError);

    const permissionRows = (permissions ?? []) as { boat_id: string; created_at: string }[];
    const [firstPermission, ...extraPermissions] = permissionRows;
    primaryBoatId = firstPermission?.boat_id ?? null;

    if (firstPermission && extraPermissions.length > 0) {
      const { error: deleteError } = await db
        .from("user_boat_permissions")
        .delete()
        .eq("user_id", userId)
        .neq("boat_id", firstPermission.boat_id);
      throwIfError(deleteError);
    }
  }

  refreshAdminRoutes(primaryBoatId);
}

export async function saveUserBoatPermission(formData: FormData) {
  const { supabase, manageableBoatIds, viewer } = await requireUserAdminAccess();
  const adminDb = requireProfileAdminClient();
  const db = supabase as any;
  const userId = formData.get("user_id")?.toString() ?? "";
  const boatId = formData.get("boat_id")?.toString() ?? "";
  assertManageableBoat(manageableBoatIds, boatId);
  const { data: profile, error: profileError } = await adminDb
    .from("profiles")
    .select("is_superuser")
    .eq("id", userId)
    .single();
  throwIfError(profileError);

  if (!viewer.isSuperuser && profile?.is_superuser) {
    throw new Error("You cannot manage superuser accounts from this screen.");
  }

  if (!profile?.is_superuser) {
    const { error: cleanupError } = await db
      .from("user_boat_permissions")
      .delete()
      .eq("user_id", userId)
      .neq("boat_id", boatId);
    throwIfError(cleanupError);
  }

  const { error } = await db
    .from("user_boat_permissions")
    .upsert(buildBoatPermissionPayload(formData, userId, viewer.isSuperuser), {
      onConflict: "user_id,boat_id",
    });
  throwIfError(error);

  refreshAdminRoutes(boatId);
}

export async function deleteUserBoatPermission(formData: FormData) {
  const { supabase, manageableBoatIds } = await requireUserAdminAccess();
  const db = supabase as any;
  const userId = formData.get("user_id")?.toString() ?? "";
  const boatId = formData.get("boat_id")?.toString() ?? "";
  assertManageableBoat(manageableBoatIds, boatId);

  const { error } = await db
    .from("user_boat_permissions")
    .delete()
    .eq("user_id", userId)
    .eq("boat_id", boatId);
  throwIfError(error);

  refreshAdminRoutes(boatId);
}

export async function createUserAccount(formData: FormData) {
  const { supabase, user, viewer, manageableBoatIds } = await requireUserAdminAccess();
  const admin = createAdminClient();

  if (!admin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured, so admin user creation is unavailable.",
    );
  }
  const adminDb = admin as any;

  const email = formData.get("email")?.toString().trim() ?? "";
  const displayName = asOptionalString(formData.get("display_name"));
  const password = formData.get("password")?.toString() ?? "";
  const boatId = asOptionalString(formData.get("boat_id"));
  const preferredLanguage =
    (formData.get("preferred_language")?.toString() as PreferredLanguage) ?? "es";
  const isGuestUser = viewer.isSuperuser
    ? toBoolean(formData.get("is_guest_user"))
    : true;

  if (!email) {
    throw new Error("Email is required.");
  }

  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (isGuestUser && !boatId) {
    throw new Error("Boat is required for guest users.");
  }

  if (boatId) {
    assertManageableBoat(manageableBoatIds, boatId);
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
    throw new Error(error.message ?? "Unexpected admin auth error.");
  }

  if (data.user?.id) {
    const db = supabase as any;
    const { error: profileError } = await adminDb
      .from("profiles")
      .update({
        preferred_language: preferredLanguage,
        onboarding_pending: true,
        is_guest_user: isGuestUser,
        created_by_user_id: user.id,
      })
      .eq("id", data.user.id);
    throwIfError(profileError);

    if (boatId) {
      const { error: permissionError } = await db
        .from("user_boat_permissions")
        .upsert(
          {
            ...buildBoatPermissionPayload(
              formData,
              data.user.id,
              viewer.isSuperuser,
            ),
            can_manage_boat_users: false,
          },
          { onConflict: "user_id,boat_id" },
        );
      throwIfError(permissionError);
    }
  }

  refreshAdminRoutes(boatId);
}

export async function inviteUserAccount(formData: FormData) {
  try {
    const { supabase, user, viewer, manageableBoatIds } =
      await requireUserAdminAccess();
    const admin = createAdminClient();

    if (!admin) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is not configured, so user invitations are unavailable.",
      );
    }
    const adminDb = admin as any;

    const email = formData.get("email")?.toString().trim() ?? "";
    const displayName = asOptionalString(formData.get("display_name"));
    const boatId = asOptionalString(formData.get("boat_id"));
    const preferredLanguage =
      (formData.get("preferred_language")?.toString() as PreferredLanguage) ?? "es";
    const isGuestUser = viewer.isSuperuser
      ? toBoolean(formData.get("is_guest_user"))
      : true;

    if (!email) {
      throw new Error("Email is required.");
    }

    if (isGuestUser && !boatId) {
      throw new Error("Boat is required for guest users.");
    }

    if (boatId) {
      assertManageableBoat(manageableBoatIds, boatId);
    }

    const requestOrigin = await getRequestOriginFromHeaders();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        ...(displayName ? { display_name: displayName } : {}),
        preferred_language: preferredLanguage,
        inviter_email: user.email ?? "",
      },
      redirectTo: buildAuthRedirectUrl("/auth/set-password", {
        requestOrigin: resolveAppOrigin({ requestOrigin }),
      }),
    });

    if (error) {
      throw new Error(error.message ?? "Unexpected invitation error.");
    }

    if (data.user?.id) {
      const db = supabase as any;
      const { error: profileError } = await adminDb
        .from("profiles")
        .update({
          display_name: displayName,
          preferred_language: preferredLanguage,
          onboarding_pending: true,
          is_guest_user: isGuestUser,
          created_by_user_id: user.id,
        })
        .eq("id", data.user.id);
      throwIfError(profileError);

      if (boatId) {
        const { error: permissionError } = await db
          .from("user_boat_permissions")
          .upsert(
            {
              ...buildBoatPermissionPayload(
                formData,
                data.user.id,
                viewer.isSuperuser,
              ),
              can_manage_boat_users: false,
            },
            {
              onConflict: "user_id,boat_id",
            },
          );
        throwIfError(permissionError);
      }
    }

    refreshAdminRoutes(boatId);
    return { error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected invitation error.";
    console.error("inviteUserAccount failed", message, error);
    return { error: message };
  }
}

export async function updateUserPassword(formData: FormData) {
  const { supabase, user, viewer, manageableBoatIds } = await requireUserAdminAccess();
  const admin = createAdminClient();

  if (!admin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured, so password changes are unavailable.",
    );
  }

  const userId = formData.get("user_id")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!userId) {
    throw new Error("User id is required.");
  }

  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (!viewer.isSuperuser && user.id !== userId) {
    const db = supabase as any;
    await assertManageableUser(db, user.id, manageableBoatIds, userId);
  }

  const { error } = await admin.auth.admin.updateUserById(userId, { password });

  if (error) {
    throw new Error(error.message ?? "Unexpected password update error.");
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
    throw new Error(error.message ?? "Unexpected user deletion error.");
  }

  refreshAdminRoutes();
}

export async function generateSeasonAccessLink(formData: FormData) {
  try {
    const boatId = formData.get("boat_id")?.toString() ?? "";
    const { supabase, user } = await requireBoatShareAccess(boatId);
    const db = supabase as any;
    const seasonId = formData.get("season_id")?.toString() ?? "";
    const inviteeName = asOptionalString(formData.get("invitee_name"));
    const canViewVisits = formData.get("can_view_visits")?.toString() !== "off";
    const window =
      (formData.get("access_window")?.toString() as SeasonAccessWindow) ?? "season_end";

    const { data: season, error: seasonError } = await db
      .from("seasons")
      .select("id, boat_id, end_date")
      .eq("id", seasonId)
      .eq("boat_id", boatId)
      .single();
    throwIfError(seasonError);

    const token = generateSeasonAccessToken();
    const expiresAt = getSeasonAccessExpiry(season.end_date, window);
    const singleUse = window === "one_use";
    const baseInsert = {
      boat_id: boatId,
      season_id: seasonId,
      token_hash: hashSeasonAccessToken(token),
      invitee_name: inviteeName,
      created_by_user_id: user.id,
      expires_at: expiresAt,
      single_use: singleUse,
    };

    let data: { id: string; expires_at: string; invitee_name?: string | null } | null = null;

    const withVisibility = await db
      .from("season_access_links")
      .insert({
        ...baseInsert,
        can_view_visits: canViewVisits,
      })
      .select("id, expires_at, invitee_name")
      .single();

    if (withVisibility.error?.message?.includes("can_view_visits")) {
      const legacyInsert = await db
        .from("season_access_links")
        .insert(baseInsert)
        .select("id, expires_at, invitee_name")
        .single();
      throwIfError(legacyInsert.error);
      data = legacyInsert.data;
    } else {
      throwIfError(withVisibility.error);
      data = withVisibility.data;
    }

    refreshAdminRoutes(boatId);

    // Build the absolute URL using the real request origin (reliable in all envs).
    const requestOrigin = await getRequestOriginFromHeaders();
    const url = buildSeasonAccessUrl(token, {
      requestOrigin: resolveAppOrigin({ requestOrigin }),
    });

    return {
      id: data?.id ?? "",
      expiresAt: data?.expires_at ?? expiresAt,
      inviteeName: data?.invitee_name ?? inviteeName,
      url,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo generar el enlace temporal.",
    };
  }
}

export async function revokeSeasonAccessLink(formData: FormData) {
  const boatId = formData.get("boat_id")?.toString() ?? "";
  const { supabase } = await requireBoatShareAccess(boatId);
  const db = supabase as any;
  const linkId = formData.get("link_id")?.toString() ?? "";

  if (!boatId || !linkId) {
    throw new Error("Boat and link are required.");
  }

  const { error } = await db
    .from("season_access_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", linkId)
    .eq("boat_id", boatId);
  throwIfError(error);

  refreshAdminRoutes(boatId);
}

export async function purgeRevokedSeasonAccessLinks(formData: FormData) {
  const boatId = formData.get("boat_id")?.toString() ?? "";
  const seasonId = formData.get("season_id")?.toString() ?? "";
  const { supabase } = await requireBoatShareAccess(boatId);
  const db = supabase as any;

  if (!boatId || !seasonId) {
    throw new Error("Boat and season are required.");
  }

  const { error } = await db
    .from("season_access_links")
    .delete()
    .eq("boat_id", boatId)
    .eq("season_id", seasonId)
    .not("revoked_at", "is", null);
  throwIfError(error);

  refreshAdminRoutes(boatId);
}
