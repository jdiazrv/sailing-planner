"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";

import { requireSuperuser } from "@/lib/boat-data";
import { createClient } from "@/lib/supabase/server";

/**
 * Permanently deletes all season_access_links whose expires_at is in the past.
 * Returns the number of rows deleted.
 */
export async function purgeExpiredAccessLinks(): Promise<{ deleted: number }> {
  await requireSuperuser();
  const supabase = await createClient();
  const db = supabase as any;

  const now = new Date().toISOString();

  const { data, error } = await db
    .from("season_access_links")
    .delete()
    .lt("expires_at", now)
    .select("id");

  if (error) {
    throw new Error(error.message ?? "Could not purge expired links.");
  }

  revalidatePath("/admin/metrics");

  return { deleted: (data ?? []).length };
}
