/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { OnboardingStep } from "@/types/database";

type ProgressRequest = {
  step?: OnboardingStep;
  action?: "dismiss" | "boat_settings_completed";
  boatId?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as ProgressRequest;

  if (body.action === "dismiss") {
    const { error } = await db
      .from("profiles")
      .update({ onboarding_pending: false, onboarding_step: null })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, nextStep: null });
  }

  if (body.action === "boat_settings_completed") {
    const boatId = body.boatId?.trim();
    if (!boatId) {
      return NextResponse.json({ ok: false, error: "boatId is required." }, { status: 400 });
    }

    const { data: seasonRows, error: seasonError } = await db
      .from("seasons")
      .select("id")
      .eq("boat_id", boatId)
      .limit(1);

    if (seasonError) {
      return NextResponse.json({ ok: false, error: seasonError.message }, { status: 500 });
    }

    const nextStep: OnboardingStep = (seasonRows?.length ?? 0) > 0 ? "full_tour" : "create_season";
    const { error } = await db
      .from("profiles")
      .update({ onboarding_pending: true, onboarding_step: nextStep })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, nextStep });
  }

  if (!body.step) {
    return NextResponse.json({ ok: false, error: "step is required." }, { status: 400 });
  }

  const { error } = await db
    .from("profiles")
    .update({ onboarding_pending: true, onboarding_step: body.step })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, nextStep: body.step });
}