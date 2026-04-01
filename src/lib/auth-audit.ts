import { createClient } from "@/lib/supabase/server";

export async function recordCurrentUserAccess() {
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

  await db
    .from("profiles")
    .update({
      sign_in_count: (profile?.sign_in_count ?? 0) + 1,
      last_sign_in_at: new Date().toISOString(),
    })
    .eq("id", user.id);
}
