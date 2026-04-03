"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from "@/lib/supabase/server";

export type ApiService = "google_maps" | "google_places" | "google_custom_search";
export type ApiSku =
  | "dynamic_maps"
  | "autocomplete_session"
  | "place_details_essentials";

/**
 * Increments the daily counter for a given service + SKU.
 * Calls the SQL function `record_api_usage` which does an upsert on the
 * (event_date, service, sku) composite key so we get one row per day.
 * Silently swallows errors — tracking failures must never break the UI.
 */
export async function recordApiUsage(
  service: ApiService,
  sku: ApiSku,
  count = 1,
): Promise<void> {
  try {
    const supabase = await createClient();
    await (supabase as any).rpc("record_api_usage", {
      p_service: service,
      p_sku: sku,
      p_count: count,
    });
  } catch {
    // Intentionally silent — tracking must never break app functionality.
  }
}
