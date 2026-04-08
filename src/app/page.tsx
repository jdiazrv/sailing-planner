import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { resolveAuthenticatedDestination } from "@/lib/auth-destination";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const [supabase, cookieStore] = await Promise.all([createClient(), cookies()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const destination = await resolveAuthenticatedDestination({
      supabase,
      user,
      lastBoatId: cookieStore.get("lastBoatId")?.value,
    });

    redirect(destination);
  }

  return (
    <main className="auth-layout">
      <AuthForm />
    </main>
  );
}
