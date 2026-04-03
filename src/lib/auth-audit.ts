import { createClient } from "@/lib/supabase/server";
import type { SignInMethod } from "@/types/database";

export async function recordCurrentUserAccess(method: SignInMethod = "unknown") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  // Supabase's generated typing for this server client path becomes too narrow here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: profile } = await db
    .from("profiles")
    .select("sign_in_count")
    .eq("id", user.id)
    .maybeSingle();

  const payload = {
    sign_in_count: (profile?.sign_in_count ?? 0) + 1,
    last_sign_in_at: new Date().toISOString(),
    last_sign_in_method: method,
  };

  const { error } = await db.from("profiles").update(payload).eq("id", user.id);

  if (error && error.message?.toLowerCase().includes("last_sign_in_method")) {
    await db
      .from("profiles")
      .update({
        sign_in_count: payload.sign_in_count,
        last_sign_in_at: payload.last_sign_in_at,
      })
      .eq("id", user.id);
  }
}
